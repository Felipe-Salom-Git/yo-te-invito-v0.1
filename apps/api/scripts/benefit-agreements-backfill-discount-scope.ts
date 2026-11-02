/**
 * G10.A4 — copy legacy profile-scoped GASTRO agreements to each billable discount.
 *
 * Usage:
 *   pnpm --filter api run benefit-agreements:backfill-discount-scope                 # DRY RUN (default)
 *   pnpm --filter api run benefit-agreements:backfill-discount-scope -- --confirm     # insert-only
 *   ... -- --tenant <tenantId>   # limit to one tenant
 *   ... -- --json                # machine-readable report
 *
 * Insert-only: never UPDATE / DELETE. Idempotent: (derivedFromAgreementId, gastroDiscountId) is
 * skipped when present. Profiles without legacy agreements get NO copies (fail-closed).
 * Production: run only after `prisma migrate deploy` + restart with G10 code (see closing doc).
 */
import { PrismaService } from '../src/prisma/prisma.service';
import { runDiscountAgreementBackfill } from '../src/modules/benefit-agreements/discount-agreement-backfill.runner';

function parseArgs(argv: string[]) {
  const tenantIdx = argv.indexOf('--tenant');
  return {
    confirm: argv.includes('--confirm'),
    json: argv.includes('--json'),
    tenantId: tenantIdx >= 0 ? argv[tenantIdx + 1] : undefined,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const prisma = new PrismaService();
  try {
    const result = await runDiscountAgreementBackfill(prisma, { confirm: args.confirm, tenantId: args.tenantId });
    const { plan } = result;
    if (args.json) {
      console.log(
        JSON.stringify(
          result,
          (_k, v) => (typeof v === 'bigint' ? v.toString() : v),
          2,
        ),
      );
      return;
    }
    const line = (label: string, value: unknown) => console.log(`${label.padEnd(34)} ${value}`);
    console.log(`\nG10.A4 backfill discount-scoped agreements — ${result.mode}${args.tenantId ? ` (tenant ${args.tenantId})` : ''}\n`);
    line('profiles scanned', plan.profilesScanned);
    line('legacy agreements', plan.legacyAgreements);
    line('discounts scanned', plan.discountsScanned);
    line('discounts candidates', plan.candidates.length);
    line('copies to insert', plan.copies.length);
    line('already existing', plan.alreadyExisting.length);
    line('profiles without agreements', plan.profilesWithoutAgreements.length);
    line('discounts without profile', plan.discountsWithoutProfile.length);
    line('funded courtesies skipped', plan.fundedCourtesiesSkipped.length);
    line('rejected w/o validations skipped', plan.rejectedWithoutValidationsSkipped.length);
    line('terminal w/o pending skipped', plan.terminalWithoutPendingSkipped.length);
    line('discounts with own agreements', plan.ownAgreementsSkipped.length);
    line('discounts without coverage', plan.discountsWithoutCoverage.length);
    line('pending validations uncovered', plan.pendingValidationsUncovered.reduce((s, p) => s + p.count, 0));

    if (plan.profilesWithoutAgreements.length) {
      console.log('\nProfiles without legacy agreements (no terms invented — MISSING_AGREEMENT until ADMIN creates one):');
      for (const id of plan.profilesWithoutAgreements) console.log(`  - ${id}`);
    }
    if (plan.discountsWithoutCoverage.length) {
      console.log('\nDiscounts without coverage:');
      for (const d of plan.discountsWithoutCoverage) {
        console.log(`  - ${d.gastroDiscountId} (profile ${d.gastroProfileId}) ${d.reason} · pending validations: ${d.pendingValidationCount}`);
      }
    }
    if (plan.pendingValidationsUncovered.length) {
      console.log('\nPending validations without a covering agreement (will be MISSING_AGREEMENT):');
      for (const p of plan.pendingValidationsUncovered) console.log(`  - discount ${p.gastroDiscountId}: ${p.count}`);
    }
    if (plan.copies.length) {
      console.log('\nCopies:');
      for (const c of plan.copies) {
        console.log(
          `  - ${c.gastroDiscountId} ← ${c.legacyAgreementId} · ${c.unitPriceCents.toString()} cents ×${c.barterMultiplier}` +
            ` · ${c.validFrom.toISOString().slice(0, 10)} → ${c.validTo ? c.validTo.toISOString().slice(0, 10) : 'open'}${c.clipped ? ' (clipped)' : ''}`,
        );
      }
    }
    if (result.mode === 'CONFIRM') {
      console.log(`\nInserted: ${result.inserted.length}`);
      console.log(`Skipped at write (re-checked in transaction): ${result.skippedAtWrite.length}`);
      for (const s of result.skippedAtWrite) console.log(`  - ${s.gastroDiscountId} ← ${s.legacyAgreementId}: ${s.reason}`);
    } else {
      console.log('\nDRY RUN — nothing written. Re-run with --confirm to insert.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
