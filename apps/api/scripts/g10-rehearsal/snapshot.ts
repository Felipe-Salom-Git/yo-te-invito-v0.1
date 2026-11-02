/**
 * G10.E3 — read-only raw snapshot of the rehearsal tenant (works before AND after the G10 migration:
 * `SELECT *` never depends on the generated client's columns).
 *
 * Usage: DATABASE_URL=…/yti_g10_rehearsal tsx scripts/g10-rehearsal/snapshot.ts --out pre.json
 */
import { writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { REHEARSAL_TENANT_NAME, argValue, assertRehearsalDatabase, jsonReplacer } from './rehearsal-guard';

const SNAPSHOT_TABLES = [
  'BenefitCommercialAgreement',
  'BenefitSettlement',
  'BenefitSettlementUsageAllocation',
  'BenefitSettlementTransfer',
  'CourtesyCreditLedgerEntry',
  'GastroProfile',
  'GastroDiscount',
  'GastroDiscountClaim',
  'GastroCourtesyCampaign',
  'AuditLog',
] as const;

async function main() {
  assertRehearsalDatabase();
  const prisma = new PrismaClient();
  try {
    const [tenant] = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      'SELECT id FROM "Tenant" WHERE name = $1',
      REHEARSAL_TENANT_NAME,
    );
    if (!tenant) throw new Error('Rehearsal tenant not found');
    const tables: Record<string, unknown[]> = {};
    for (const table of SNAPSHOT_TABLES) {
      tables[table] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}" WHERE "tenantId" = $1 ORDER BY id`, tenant.id);
    }
    tables.GastroDiscountValidation = await prisma.$queryRawUnsafe(
      'SELECT v.* FROM "GastroDiscountValidation" v JOIN "GastroDiscount" d ON d.id = v."discountId" WHERE d."tenantId" = $1 ORDER BY v.id',
      tenant.id,
    );
    const migrations = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL ORDER BY migration_name',
    );
    const snapshot = {
      takenAt: new Date().toISOString(),
      tenantId: tenant.id,
      appliedMigrations: migrations.length,
      lastMigration: migrations[migrations.length - 1]?.migration_name ?? null,
      counts: Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length])),
      tables,
    };
    const out = argValue('--out');
    const json = JSON.stringify(snapshot, jsonReplacer, 2);
    if (out) writeFileSync(out, json);
    console.log(JSON.stringify({ appliedMigrations: snapshot.appliedMigrations, lastMigration: snapshot.lastMigration, counts: snapshot.counts }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
