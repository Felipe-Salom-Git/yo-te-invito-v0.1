/**
 * G10.A5 — settlement pricing per discount against real PostgreSQL.
 * Run: pnpm --filter api run test:g10-discount-pricing
 */

import { randomBytes } from 'node:crypto';
import { ErrorCode } from '@yo-te-invito/shared';
import { codeOf, errorOf } from './lib/courtesy-fake-db';
import {
  buildG10Services,
  createG10Discount,
  fundG10Courtesy,
  insertG10Agreement,
  redeemG10Uses,
  withG10Db,
} from './lib/g10-agreements-db-seed';

const hex = (n: number) => randomBytes(n).toString('hex');
let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

const FROM = '2026-01-01T03:00:00.000Z';
const MISSING = ErrorCode.BENEFIT_SETTLEMENT_MISSING_AGREEMENTS;

async function main() {
  const result = await withG10Db(async (prisma, seed) => {
    const svc = buildG10Services(prisma);
    const actor = { id: seed.adminId, role: 'ADMIN' };
    const { tenantId, profileA, profileB } = seed;
    const onA = { profileId: profileA, eventId: seed.eventA };
    const generate = (gastroProfileId: string, periodKey: string) =>
      svc.settlements.generate(tenantId, actor, { vertical: 'GASTRO', gastroProfileId, periodKey });

    // Legacy profile agreement exists but must never price new usage.
    const legacy = await insertG10Agreement(prisma, seed, { gastroProfileId: profileA }, { unitPriceCents: 999900n, validFrom: '2025-01-01T03:00:00.000Z' });

    const A = await createG10Discount(prisma, seed, onA);
    const B = await createG10Discount(prisma, seed, onA);
    const C = await createG10Discount(prisma, seed, onA); // no agreement of its own
    const NF = await createG10Discount(prisma, seed, { ...onA, courtesy: true }); // non-funded courtesy
    const NFX = await createG10Discount(prisma, seed, { ...onA, courtesy: true }); // non-funded, no agreement
    const F = await createG10Discount(prisma, seed, { ...onA, courtesy: true }); // funded courtesy
    await fundG10Courtesy(prisma, svc.ledger, seed, { profileId: profileA, campaignId: F.campaignId!, imputedValueCents: 200000n });
    const agA = await insertG10Agreement(prisma, seed, { gastroProfileId: profileA, gastroDiscountId: A.discountId }, { unitPriceCents: 500000n, validFrom: FROM });
    const agB = await insertG10Agreement(prisma, seed, { gastroProfileId: profileA, gastroDiscountId: B.discountId }, { unitPriceCents: 750000n, validFrom: FROM });
    await insertG10Agreement(prisma, seed, { gastroProfileId: profileA, gastroDiscountId: NF.discountId }, { unitPriceCents: 300000n, validFrom: FROM });

    const vA = await redeemG10Uses(prisma, seed, { discountId: A.discountId, uses: 2, validatedAt: '2026-11-03T15:00:00.000Z' });
    const vB = await redeemG10Uses(prisma, seed, { discountId: B.discountId, uses: 2, validatedAt: '2026-11-04T15:00:00.000Z' });
    const vC = await redeemG10Uses(prisma, seed, { discountId: C.discountId, uses: 1, validatedAt: '2026-11-05T15:00:00.000Z' });
    const vNF = await redeemG10Uses(prisma, seed, { discountId: NF.discountId, campaignId: NF.campaignId, uses: 1, validatedAt: '2026-11-06T15:00:00.000Z' });
    const vNFX = await redeemG10Uses(prisma, seed, { discountId: NFX.discountId, campaignId: NFX.campaignId, uses: 1, validatedAt: '2026-11-07T15:00:00.000Z' });
    const vF = await redeemG10Uses(prisma, seed, { discountId: F.discountId, campaignId: F.campaignId, uses: 2, validatedAt: '2026-11-08T15:00:00.000Z' });

    // ── Generate: never blocked by C / NFX (D-G10-6) ──
    const s = await generate(profileA, '2026-11');
    check(s.summary.pendingUsageCount === 5, 'generate: A(2) + B(2) + NF(1) priced');
    check(s.summary.missingAgreementUsageCount === 2, 'generate: C + NFX reported as missing (not blocking)');
    const groups = new Map((s.summary.missingAgreementsByBenefit ?? []).map((g) => [g.benefitId, g.usageCount]));
    check(groups.get(C.discountId) === 1 && groups.get(NFX.discountId) === 1, 'missing agreements grouped by discount');
    check(s.summary.fundedCourtesyUsageCount === 2 && !groups.has(F.discountId), 'funded courtesy excluded before agreement lookup (never MISSING)');

    // ── Pricing per discount: A $5.000 / B $7.500 / NF $3.000; legacy never used ──
    const pending = await svc.pending.list(tenantId, s.id);
    const price = new Map(pending.data.map((p) => [p.validationId, p] as const));
    check(vA.every((id) => price.get(id)?.unitPriceCents === '500000' && price.get(id)?.agreementId === agA.id), 'validation A → $5.000 (agreement A)');
    check(vB.every((id) => price.get(id)?.unitPriceCents === '750000' && price.get(id)?.agreementId === agB.id), 'validation B → $7.500 (agreement B)');
    check(price.get(vNF[0]!)?.unitPriceCents === '300000', 'non-funded courtesy priced with its OWN agreement ($3.000)');
    check(![...price.values()].some((p) => p.agreementId === legacy.id), 'legacy profile agreement excluded from new pricing');
    check(!price.has(vC[0]!) && !price.has(vNFX[0]!), 'discounts without own agreement are not priced (no fallback to A or legacy)');
    check(pending.missingAgreementCount === 2 && (pending.missingAgreementsByBenefit ?? []).length === 2, 'pending list exposes missing by discount');

    // ── Allocate ──
    const allocA = await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: vA });
    check(allocA.allocations.length === 2 && allocA.allocations.every((a) => a.baseAmountCents === '500000'), 'allocate A explicit → PASS ($5.000 snapshot)');
    const errC = await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: vC }));
    check(codeOf(errC) === MISSING, 'allocate C explicit → MISSING_AGREEMENTS');
    const errMixed = await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: [vB[0]!, vC[0]!] }));
    check(codeOf(errMixed) === MISSING, 'mixed selection containing C → rejected as a whole');
    const errFunded = await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: [vF[0]!] }));
    check(codeOf(errFunded) === ErrorCode.BENEFIT_SETTLEMENT_VALIDATION_FUNDED_COURTESY, 'funded courtesy still rejected (D1)');
    const errCount = await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'BARTER', count: 4 }));
    check(codeOf(errCount) === ErrorCode.BENEFIT_SETTLEMENT_INSUFFICIENT_PENDING_USAGES, 'allocate count cannot consume validations without agreement');
    const allocCount = await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'BARTER', count: 3 });
    const countIds = new Set(allocCount.allocations.map((a) => a.validationId));
    check(
      countIds.size === 3 && [...vB, ...vNF].every((id) => countIds.has(id)) && !countIds.has(vC[0]!),
      'allocate count picks only priced validations (B + NF)',
    );
    check(allocCount.settlement.summary.cashDueCents === '1000000', 'CASH due = A only ($10.000)');

    // ── Close still blocks while billable usages lack agreement ──
    check(codeOf(await errorOf(() => svc.settlements.close(tenantId, actor, s.id))) === MISSING, 'close → MISSING_AGREEMENTS (C, NFX)');
    await insertG10Agreement(prisma, seed, { gastroProfileId: profileA, gastroDiscountId: C.discountId }, { unitPriceCents: 400000n, validFrom: FROM });
    await insertG10Agreement(prisma, seed, { gastroProfileId: profileA, gastroDiscountId: NFX.discountId }, { unitPriceCents: 100000n, validFrom: FROM });
    await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', count: 2 });
    const closed = await svc.settlements.close(tenantId, actor, s.id);
    check(closed.status === 'CLOSED' && closed.summary.cashDueCents === '1500000', 'after C/NFX agreements: allocate + close OK (A 10.000 + C 4.000 + NFX 1.000)');

    // ── Historical allocation on legacy agreement unchanged ──
    const [hv] = await redeemG10Uses(prisma, seed, { discountId: A.discountId, uses: 1, validatedAt: '2026-10-02T15:00:00.000Z' });
    const s10 = await prisma.benefitSettlement.create({ data: { tenantId, vertical: 'GASTRO', gastroProfileId: profileA, periodKey: '2026-10' } });
    const historical = await prisma.benefitSettlementUsageAllocation.create({
      data: { tenantId, settlementId: s10.id, validationSource: 'GASTRO_DISCOUNT_VALIDATION', validationId: hv!, mode: 'CASH', agreementId: legacy.id, unitPriceCents: 999900n, barterMultiplier: '2', baseAmountCents: 999900n },
    });
    const s10dto = await svc.settlements.refresh(tenantId, actor, s10.id);
    const historicalAfter = await prisma.benefitSettlementUsageAllocation.findUniqueOrThrow({ where: { id: historical.id } });
    check(historicalAfter.agreementId === legacy.id && historicalAfter.baseAmountCents === 999900n, 'historical legacy allocation unchanged');
    check(s10dto.summary.cashDueCents === '999900', 'historical settlement due keeps legacy snapshot');
    const s10Integrity = await svc.integrity.evaluateSettlement(tenantId, s10.id);
    check(!s10Integrity.issues.some((i) => i.code === 'ALLOCATION_AGREEMENT_DISCOUNT_MISMATCH'), 'legacy allocation not flagged by discount-agreement check');

    // ── Integrity: agreement of A pricing B → flagged; cross-profile agreement → ignored + flagged ──
    const [vB2] = await redeemG10Uses(prisma, seed, { discountId: B.discountId, uses: 1, validatedAt: '2026-10-03T15:00:00.000Z' });
    const bad = await prisma.benefitSettlementUsageAllocation.create({
      data: { tenantId, settlementId: s10.id, validationSource: 'GASTRO_DISCOUNT_VALIDATION', validationId: vB2!, mode: 'CASH', agreementId: agA.id, unitPriceCents: 500000n, barterMultiplier: '2', baseAmountCents: 500000n },
    });
    const badIntegrity = await svc.integrity.evaluateSettlement(tenantId, s10.id);
    check(
      badIntegrity.issues.some((i) => i.code === 'ALLOCATION_AGREEMENT_DISCOUNT_MISMATCH' && i.entityId === bad.id),
      'integrity: allocation priced with another discount agreement → ALLOCATION_AGREEMENT_DISCOUNT_MISMATCH',
    );
    const X = await createG10Discount(prisma, seed, onA);
    const cross = await insertG10Agreement(prisma, seed, { gastroProfileId: profileB, gastroDiscountId: X.discountId }, { unitPriceCents: 111100n, validFrom: FROM });
    const scopeIssues = await svc.integrity.evaluateAgreementScopes(tenantId);
    check(scopeIssues.some((i) => i.code === 'AGREEMENT_SCOPE_MISMATCH' && i.entityId === cross.id), 'integrity: cross-profile agreement → AGREEMENT_SCOPE_MISMATCH');
    const [vX] = await redeemG10Uses(prisma, seed, { discountId: X.discountId, uses: 1, validatedAt: '2026-12-02T15:00:00.000Z' });
    const s12 = await generate(profileA, '2026-12');
    check(s12.summary.pendingUsageCount === 0 && s12.summary.missingAgreementUsageCount === 1, 'cross-profile agreement never prices X (fail-closed → MISSING)');
    void vX;

    // ── ACTIVITY regression: operator agreement, settlement, allocation, missing still blocks ──
    await svc.agreements.create(tenantId, actor, {
      vertical: 'ACTIVITY',
      excursionOperatorId: seed.operatorId,
      unitPriceCents: '200000',
      barterMultiplier: '2',
      currency: 'ARS',
      validFrom: '2026-06-01',
    });
    const coupon = await prisma.activityCoupon.create({
      data: {
        tenantId,
        eventId: seed.activityEventId,
        excursionOperatorId: seed.operatorId,
        code: `G10-${hex(3)}`,
        title: 'Cupón G10',
        summary: 's',
        detail: 'd',
        type: 'PERCENT',
        value: 10,
        status: 'ACTIVE',
      },
    });
    const activityValidation = async (validatedAt: string) => {
      const claim = await prisma.activityCouponClaim.create({
        data: { tenantId, couponId: coupon.id, email: `a-${hex(3)}@g10.test`, qrToken: hex(24), accessToken: hex(32), shortCode: hex(4).toUpperCase(), status: 'USED', usedAt: new Date(validatedAt) },
      });
      return prisma.activityCouponValidation.create({
        data: { couponId: coupon.id, claimId: claim.id, result: 'VALID', validatedAt: new Date(validatedAt) },
      });
    };
    await activityValidation('2026-11-10T15:00:00.000Z');
    const sAct = await svc.settlements.generate(tenantId, actor, { vertical: 'ACTIVITY', excursionOperatorId: seed.operatorId, periodKey: '2026-11' });
    check(sAct.summary.pendingUsageCount === 1 && sAct.summary.pendingBaseAmountCents === '200000', 'ACTIVITY: operator agreement prices usage (unchanged)');
    const aAct = await svc.settlements.allocate(tenantId, actor, sAct.id, { mode: 'CASH', count: 1 });
    check(aAct.settlement.summary.cashDueCents === '200000', 'ACTIVITY: CASH allocation unchanged');
    await activityValidation('2026-05-10T15:00:00.000Z');
    const actMissing = await errorOf(() =>
      svc.settlements.generate(tenantId, actor, { vertical: 'ACTIVITY', excursionOperatorId: seed.operatorId, periodKey: '2026-05' }),
    );
    check(codeOf(actMissing) === MISSING, 'ACTIVITY: missing agreement still blocks generate (pre-G10 semantics)');
  });

  console.log(`\nDB integration: ${result}`);
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G10 discount pricing checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
