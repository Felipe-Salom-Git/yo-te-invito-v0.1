/**
 * G10.E3 — compares two rehearsal snapshots (pure, reads JSON files only).
 *
 *   tsx scripts/g10-rehearsal/verify.ts --mode identical --before a.json --after b.json
 *     → no row inserted, updated or deleted (dry-run / integrity are read-only).
 *     Add --across-migration to compare before/after `prisma migrate deploy` (data untouched).
 *   tsx scripts/g10-rehearsal/verify.ts --mode backfill --before pre.json --after post.json --ids ids.json
 *     → pre-existing rows unchanged (new nullable columns = null), only discount-scoped agreement
 *       INSERTs + their audit rows, expected copies per discount, no-contract profiles untouched.
 */
import { readFileSync } from 'node:fs';
import { argValue } from './rehearsal-guard';

type Row = Record<string, unknown> & { id: string };
type Snapshot = { tables: Record<string, Row[]>; appliedMigrations: number; lastMigration: string | null };

const G10_COLUMNS: Record<string, string[]> = {
  BenefitCommercialAgreement: ['gastroDiscountId', 'derivedFromAgreementId'],
  BenefitSettlementTransfer: ['gastroDiscountId'],
};
const EXPECTED_COPIES: Record<string, number> = { D1a: 1, D1b: 1, D2a: 2, D2b: 1, D5a: 1 };
const NEVER_COVERED = ['D1c', 'D1d', 'D3a', 'D4a', 'D5c'];

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

const load = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
const byId = (rows: Row[]) => new Map(rows.map((r) => [r.id, r] as const));

/** Every row of `before` exists in `after` with the same value for every `before` column. */
function preservedRows(table: string, before: Row[], after: Row[]): { changed: string[]; deleted: string[] } {
  const afterById = byId(after);
  const changed: string[] = [];
  const deleted: string[] = [];
  for (const row of before) {
    const now = afterById.get(row.id);
    if (!now) {
      deleted.push(row.id);
      continue;
    }
    const diff = Object.keys(row).filter((k) => JSON.stringify(row[k]) !== JSON.stringify(now[k]));
    if (diff.length) changed.push(`${row.id} (${diff.join(', ')})`);
    for (const col of G10_COLUMNS[table] ?? []) {
      if (!(col in row) && now[col] != null) changed.push(`${row.id} (${col} set on a pre-existing row)`);
    }
  }
  return { changed, deleted };
}

function main() {
  const mode = argValue('--mode');
  const before = load(argValue('--before')!);
  const after = load(argValue('--after')!);

  for (const [table, rows] of Object.entries(before.tables)) {
    const { changed, deleted } = preservedRows(table, rows, after.tables[table] ?? []);
    check(changed.length === 0, `${table}: no pre-existing row updated${changed.length ? ` → ${changed.join('; ')}` : ''}`);
    check(deleted.length === 0, `${table}: no row deleted${deleted.length ? ` → ${deleted.join(', ')}` : ''}`);
  }
  const inserted = (table: string) => {
    const known = new Set((before.tables[table] ?? []).map((r) => r.id));
    return (after.tables[table] ?? []).filter((r) => !known.has(r.id));
  };

  if (mode === 'identical') {
    for (const table of Object.keys(after.tables)) {
      check(inserted(table).length === 0, `${table}: no row inserted`);
    }
    if (process.argv.includes('--across-migration')) {
      check(after.appliedMigrations === before.appliedMigrations + 1, `exactly one migration applied (${after.lastMigration})`);
    } else {
      check(before.appliedMigrations === after.appliedMigrations, 'no migration applied in between');
    }
  } else if (mode === 'backfill') {
    const ids = JSON.parse(readFileSync(argValue('--ids')!, 'utf8')) as {
      profiles: Record<string, string>;
      legacyAgreements: Record<string, string>;
      discounts: Record<string, string>;
    };
    for (const table of Object.keys(after.tables)) {
      if (table === 'BenefitCommercialAgreement' || table === 'AuditLog') continue;
      check(inserted(table).length === 0, `${table}: no row inserted (insert-only scope = agreements + audit)`);
    }
    const legacyById = byId((before.tables.BenefitCommercialAgreement ?? []).filter((a) => a.vertical === 'GASTRO'));
    const copies = inserted('BenefitCommercialAgreement');
    const expectedTotal = Object.values(EXPECTED_COPIES).reduce((s, n) => s + n, 0);
    check(copies.length === expectedTotal, `agreements: ${copies.length} copies inserted (expected ${expectedTotal})`);
    for (const copy of copies) {
      const legacy = legacyById.get(String(copy.derivedFromAgreementId));
      check(
        copy.gastroDiscountId != null &&
          legacy != null &&
          copy.gastroProfileId === legacy.gastroProfileId &&
          copy.unitPriceCents === legacy.unitPriceCents &&
          copy.barterMultiplier === legacy.barterMultiplier &&
          copy.createdByUserId == null,
        `copy ${copy.id}: discount-scoped, derived from a legacy row of the same local with identical terms`,
      );
    }
    for (const [key, n] of Object.entries(EXPECTED_COPIES)) {
      const got = copies.filter((c) => c.gastroDiscountId === ids.discounts[key]).length;
      check(got === n, `${key}: ${got} copy(ies) (expected ${n})`);
    }
    for (const key of NEVER_COVERED) {
      const got = (after.tables.BenefitCommercialAgreement ?? []).filter((c) => c.gastroDiscountId === ids.discounts[key]).length;
      check(got === 0, `${key}: no contract invented`);
    }
    for (const key of ['P3', 'P4']) {
      const got = (after.tables.BenefitCommercialAgreement ?? []).filter((a) => a.gastroProfileId === ids.profiles[key]).length;
      check(got === 0, `${key}: profile without legacy contract still has 0 agreements`);
    }
    const audits = inserted('AuditLog');
    const copyIds = new Set(copies.map((c) => c.id));
    check(audits.length === copies.length, `audit: ${audits.length} audit rows for ${copies.length} copies`);
    check(
      audits.every(
        (a) =>
          a.action === 'BENEFIT_AGREEMENT_CREATED' &&
          a.actorId === 'system:g10-discount-agreement-backfill' &&
          copyIds.has(String(a.entityId)) &&
          (a.metadata as { backfill?: string } | null)?.backfill === 'G10.A4',
      ),
      'audit: every new audit row is BENEFIT_AGREEMENT_CREATED by the backfill actor (metadata.backfill = G10.A4)',
    );
  } else {
    throw new Error('--mode must be identical | backfill');
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nverify ${mode}: PASS`);
}

main();
