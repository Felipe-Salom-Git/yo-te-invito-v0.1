/**
 * G10.A4 — backfill planner (pure) + dry-run / confirm / idempotent re-run against PostgreSQL.
 * Run: pnpm --filter api run test:g10-agreement-backfill
 */

import {
  clipLegacySegmentToDiscount,
  planDiscountAgreementBackfill,
  type BackfillDiscount,
  type BackfillLegacyAgreement,
} from '../src/modules/benefit-agreements/discount-agreement-backfill.plan';
import { runDiscountAgreementBackfill } from '../src/modules/benefit-agreements/discount-agreement-backfill.runner';
import {
  buildG10Services,
  createG10Discount,
  fundG10Courtesy,
  insertG10Agreement,
  redeemG10Uses,
  withG10Db,
} from './lib/g10-agreements-db-seed';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

const AR = (key: string) => new Date(`${key}T03:00:00.000Z`);
const legacy = (id: string, profile: string, from: string, to?: string): BackfillLegacyAgreement => ({
  id,
  tenantId: 't',
  gastroProfileId: profile,
  unitPriceCents: 500000n,
  barterMultiplier: '2',
  currency: 'ARS',
  validFrom: AR(from),
  validTo: to ? new Date(`${to}T23:59:59.999-03:00`) : null,
});
const discount = (id: string, profile: string | null, createdKey: string, extra: Partial<BackfillDiscount> = {}): BackfillDiscount => ({
  id,
  tenantId: 't',
  gastroProfileId: profile,
  status: 'ACTIVE',
  visibility: 'PUBLIC',
  archivedAt: null,
  createdAt: new Date(`${createdKey}T15:00:00.000Z`),
  fundedCourtesy: false,
  validationCount: 0,
  pendingValidatedAt: [],
  existingAgreements: [],
  ...extra,
});

function pureChecks() {
  // ── Clipping: no coverage before the discount existed ──
  const clipped = clipLegacySegmentToDiscount(legacy('P', 'gp1', '2025-01-01'), new Date('2026-03-01T15:00:00.000Z'));
  check(clipped?.clipped === true && clipped.validFrom.toISOString() === '2026-03-01T03:00:00.000Z', 'segment clipped to discount creation day (AR)');
  const notClipped = clipLegacySegmentToDiscount(legacy('P', 'gp1', '2026-05-01'), new Date('2026-03-01T15:00:00.000Z'));
  check(notClipped?.clipped === false, 'segment starting after creation kept as is');
  check(
    clipLegacySegmentToDiscount(legacy('P', 'gp1', '2025-01-01', '2025-12-31'), new Date('2026-03-01T15:00:00.000Z')) === null,
    'segment ended before the discount existed → not copied',
  );

  // ── Legacy P + discounts A/B → copies A_P / B_P ──
  const p1 = planDiscountAgreementBackfill({
    legacy: [legacy('P', 'gp1', '2025-01-01')],
    discounts: [discount('A', 'gp1', '2026-01-10'), discount('B', 'gp1', '2026-02-10')],
  });
  check(p1.copies.length === 2 && p1.copies.map((c) => c.gastroDiscountId).sort().join() === 'A,B', 'legacy P → copies A_P and B_P');
  check(p1.copies.every((c) => c.legacyAgreementId === 'P' && c.unitPriceCents === 500000n), 'copies keep terms + lineage');

  // ── History P1 + P2 ──
  const p2 = planDiscountAgreementBackfill({
    legacy: [legacy('P1', 'gp1', '2025-01-01', '2026-02-28'), legacy('P2', 'gp1', '2026-03-01')],
    discounts: [discount('OLD', 'gp1', '2025-06-01'), discount('NEW', 'gp1', '2026-04-01')],
  });
  check(p2.copies.filter((c) => c.gastroDiscountId === 'OLD').length === 2, 'discount alive across history gets both segments');
  check(
    p2.copies.filter((c) => c.gastroDiscountId === 'NEW').map((c) => c.legacyAgreementId).join() === 'P2',
    'discount created after P1 ended gets only P2',
  );

  // ── Eligibility (D-G10-2) ──
  const p3 = planDiscountAgreementBackfill({
    legacy: [legacy('P', 'gp1', '2025-01-01')],
    discounts: [
      discount('FUNDED', 'gp1', '2026-01-01', { visibility: 'COURTESY_ONLY', fundedCourtesy: true }),
      discount('COURTESY', 'gp1', '2026-01-01', { visibility: 'COURTESY_ONLY' }),
      discount('REJ', 'gp1', '2026-01-01', { status: 'REJECTED' }),
      discount('EXP_DONE', 'gp1', '2026-01-01', { status: 'EXPIRED', validationCount: 3 }),
      discount('EXP_PENDING', 'gp1', '2026-01-01', { status: 'EXPIRED', validationCount: 1, pendingValidatedAt: [AR('2026-02-01')] }),
      discount('ARCH_PENDING', 'gp1', '2026-01-01', { archivedAt: AR('2026-06-01'), validationCount: 1, pendingValidatedAt: [AR('2026-02-01')] }),
      discount('NOPROFILE', null, '2026-01-01'),
      discount('OWN', 'gp1', '2026-01-01', { existingAgreements: [{ id: 'x', derivedFromAgreementId: null, validFrom: AR('2026-01-01'), validTo: null }] }),
      discount('DONE', 'gp1', '2026-01-01', { existingAgreements: [{ id: 'y', derivedFromAgreementId: 'P', validFrom: AR('2026-01-01'), validTo: null }] }),
    ],
  });
  const copied = new Set(p3.copies.map((c) => c.gastroDiscountId));
  check(p3.fundedCourtesiesSkipped.join() === 'FUNDED' && !copied.has('FUNDED'), 'funded courtesy skipped (D1/D-G10-3)');
  check(copied.has('COURTESY'), 'non-funded courtesy gets its own copy');
  check(p3.rejectedWithoutValidationsSkipped.join() === 'REJ', 'REJECTED without validations skipped');
  check(p3.terminalWithoutPendingSkipped.join() === 'EXP_DONE', 'expired without pending validations skipped');
  check(copied.has('EXP_PENDING') && copied.has('ARCH_PENDING'), 'expired/archived with pending validations included');
  check(p3.discountsWithoutProfile.join() === 'NOPROFILE', 'discount without profile reported');
  check(p3.ownAgreementsSkipped.join() === 'OWN' && !copied.has('OWN'), 'discount with its own agreement untouched');
  check(
    p3.alreadyExisting.some((e) => e.gastroDiscountId === 'DONE') && !copied.has('DONE'),
    'idempotent: existing copy → already existing, no new copy',
  );

  // ── Profile without agreements: no terms invented ──
  const p4 = planDiscountAgreementBackfill({
    legacy: [],
    discounts: [discount('C', 'gpX', '2026-01-01', { validationCount: 2, pendingValidatedAt: [AR('2026-02-01'), AR('2026-02-02')] })],
  });
  check(p4.copies.length === 0, 'profile without legacy agreements → zero copies (no invented terms)');
  check(p4.profilesWithoutAgreements.join() === 'gpX', 'profile without agreements reported');
  check(
    p4.discountsWithoutCoverage[0]?.reason === 'PROFILE_WITHOUT_AGREEMENTS' && p4.pendingValidationsUncovered[0]?.count === 2,
    'discount without coverage + its pending validations reported',
  );

  // ── Overlapping legacy rows (pre-G10 race) → never copied ──
  const p5 = planDiscountAgreementBackfill({
    legacy: [legacy('L1', 'gp1', '2025-01-01'), legacy('L2', 'gp1', '2025-06-01')],
    discounts: [discount('D', 'gp1', '2026-01-01')],
  });
  check(p5.copies.length === 0 && p5.discountsWithoutCoverage[0]?.reason === 'LEGACY_OVERLAP', 'overlapping legacy segments → skipped, reported');
}

async function dbChecks() {
  return withG10Db(async (prisma, seed) => {
    const svc = buildG10Services(prisma);
    const { tenantId, profileA, profileB } = seed;
    const P = await insertG10Agreement(prisma, seed, { gastroProfileId: profileA }, { unitPriceCents: 500000n, validFrom: '2026-01-01T03:00:00.000Z' });
    const A = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA, createdAt: '2026-02-01T15:00:00.000Z' });
    const B = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA, createdAt: '2026-03-01T15:00:00.000Z' });
    const F = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA, courtesy: true });
    await fundG10Courtesy(prisma, svc.ledger, seed, { profileId: profileA, campaignId: F.campaignId!, imputedValueCents: 100000n });
    const R = await createG10Discount(prisma, seed, { profileId: profileA, eventId: seed.eventA, status: 'REJECTED' });
    const C = await createG10Discount(prisma, seed, { profileId: profileB, eventId: seed.eventB });
    await redeemG10Uses(prisma, seed, { discountId: C.discountId, uses: 1, validatedAt: '2026-10-05T15:00:00.000Z' });

    // Historical allocation priced with legacy P (pre-G10).
    const [hv] = await redeemG10Uses(prisma, seed, { discountId: A.discountId, uses: 1, validatedAt: '2026-02-10T15:00:00.000Z' });
    const settlement = await prisma.benefitSettlement.create({
      data: { tenantId, vertical: 'GASTRO', gastroProfileId: profileA, periodKey: '2026-02', createdByUserId: seed.adminId },
    });
    const historical = await prisma.benefitSettlementUsageAllocation.create({
      data: {
        tenantId,
        settlementId: settlement.id,
        validationSource: 'GASTRO_DISCOUNT_VALIDATION',
        validationId: hv!,
        mode: 'CASH',
        agreementId: P.id,
        unitPriceCents: 500000n,
        barterMultiplier: '2',
        baseAmountCents: 500000n,
      },
    });

    const dry = await runDiscountAgreementBackfill(prisma, { confirm: false, tenantId });
    check(dry.mode === 'DRY_RUN' && dry.plan.copies.length === 2, 'dry-run plans copies A_P and B_P');
    check(
      (await prisma.benefitCommercialAgreement.count({ where: { tenantId, gastroDiscountId: { not: null } } })) === 0,
      'dry-run writes nothing',
    );
    check(dry.plan.fundedCourtesiesSkipped.includes(F.discountId), 'dry-run: funded courtesy skipped');
    check(dry.plan.rejectedWithoutValidationsSkipped.includes(R.discountId), 'dry-run: REJECTED without validations skipped');
    check(
      dry.plan.profilesWithoutAgreements.includes(profileB) &&
        dry.plan.discountsWithoutCoverage.some((d) => d.gastroDiscountId === C.discountId && d.reason === 'PROFILE_WITHOUT_AGREEMENTS'),
      'dry-run: profile B without agreements → C without coverage',
    );

    const first = await runDiscountAgreementBackfill(prisma, { confirm: true, tenantId });
    check(first.inserted.length === 2 && first.skippedAtWrite.length === 0, 'first confirm → 2 inserts');
    const copies = await prisma.benefitCommercialAgreement.findMany({ where: { tenantId, gastroDiscountId: { not: null } } });
    check(
      copies.every((c) => c.derivedFromAgreementId === P.id && c.gastroProfileId === profileA && c.unitPriceCents === 500000n),
      'copies carry lineage, profile and terms',
    );
    const copyA = copies.find((c) => c.gastroDiscountId === A.discountId)!;
    check(copyA.validFrom.toISOString() === '2026-02-01T03:00:00.000Z', 'copy A clipped to A creation day');
    check(
      (await prisma.auditLog.count({ where: { tenantId, entityId: { in: copies.map((c) => c.id) }, action: 'BENEFIT_AGREEMENT_CREATED' } })) === 2,
      'each copy audited (SYSTEM actor)',
    );

    const second = await runDiscountAgreementBackfill(prisma, { confirm: true, tenantId });
    check(second.inserted.length === 0 && second.plan.alreadyExisting.length === 2, 'second confirm → 0 inserts (idempotent)');
    check(
      (await prisma.benefitCommercialAgreement.count({ where: { tenantId, gastroDiscountId: { not: null } } })) === 2,
      'no duplicated copies after re-run',
    );

    const after = await prisma.benefitSettlementUsageAllocation.findUniqueOrThrow({ where: { id: historical.id } });
    check(
      after.agreementId === P.id && after.unitPriceCents === 500000n && after.baseAmountCents === 500000n,
      'historical allocation still points to legacy P (unchanged)',
    );
    const legacyAfter = await prisma.benefitCommercialAgreement.findUniqueOrThrow({ where: { id: P.id } });
    check(legacyAfter.gastroDiscountId === null && legacyAfter.validTo === null, 'legacy P untouched (no UPDATE)');
    const histA = await svc.discountHistory.discountHistory(tenantId, A.discountId);
    check(
      histA.current?.id === copyA.id && histA.legacyUsed.length === 1 && histA.legacyUsed[0]!.agreement.id === P.id,
      'discount history: current = copy, legacyUsed = P (1 historical allocation)',
    );
    const integrity = await svc.integrity.evaluateAgreementScopes(tenantId);
    check(integrity.length === 0, 'integrity: no AGREEMENT_SCOPE_MISMATCH after backfill');
  });
}

async function main() {
  pureChecks();
  const db = await dbChecks();
  console.log(`\nDB integration: ${db}`);
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G10 agreement backfill checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
