/**
 * G10.D2 — allocation isolation per discount (CASH / CANJE) against real PostgreSQL.
 * Run: pnpm --filter api run test:g10-discount-allocation-db
 */

import { codeOf, errorOf } from './lib/courtesy-fake-db';
import { createG10Discount, fundG10Courtesy, redeemG10Uses, withG10Db } from './lib/g10-agreements-db-seed';
import { buildPaymentServices, pricedDiscount } from './lib/g10-discount-payments-db-scenarios';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

async function main() {
  const result = await withG10Db(async (prisma, seed) => {
    const svc = buildPaymentServices(prisma);
    const { tenantId, profileA, profileB } = seed;
    const actor = { id: seed.adminId, role: 'ADMIN' };
    const onA = { profileId: profileA, eventId: seed.eventA };
    const pendingOf = (discountId: string) => svc.discountPending.listForAdmin(tenantId, profileA, discountId);
    const ledgerCredits = (allocationIds: string[]) =>
      prisma.courtesyCreditLedgerEntry.findMany({ where: { tenantId, type: 'CREDIT_FROM_SETTLEMENT', sourceAllocationId: { in: allocationIds } } });

    const A = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 500000n, uses: 3, validatedAt: '2026-11-02T15:00:00.000Z' });
    const E = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 500000n, multiplier: '2', uses: 4, validatedAt: '2026-11-04T15:00:00.000Z' });
    const M = await createG10Discount(prisma, seed, onA);
    const vM = await redeemG10Uses(prisma, seed, { discountId: M.discountId, uses: 2, validatedAt: '2026-11-06T15:00:00.000Z' });
    const F = await createG10Discount(prisma, seed, { ...onA, courtesy: true });
    await fundG10Courtesy(prisma, svc.ledger, seed, { profileId: profileA, campaignId: F.campaignId!, imputedValueCents: 200000n });
    const vF = await redeemG10Uses(prisma, seed, { discountId: F.discountId, campaignId: F.campaignId, uses: 2, validatedAt: '2026-11-07T15:00:00.000Z' });

    // ── Pending list before any settlement exists ──
    let pA = await pendingOf(A.discountId);
    check(pA.billable && pA.data.length === 3 && pA.data.every((r) => r.pricingStatus === 'PRICED' && r.unitPriceCents === '500000' && r.allocatable), 'list: A has 3 PRICED allocatable validations ($5.000)');
    check(pA.data.every((r) => r.settlementId === null && r.periodKey === '2026-11' && Boolean(r.claimShortCode) && Boolean(r.claimEmail)), 'list: period 2026-11, no settlement yet, claim shortCode + email');
    check(codeOf(await errorOf(() => svc.discountPending.listForAdmin(tenantId, profileB, A.discountId))) === 'NOT_FOUND', 'list: profile B URL + discount A → 404');

    // ── generate does not block on missing agreements; grouped by discount ──
    const s = await svc.settlements.generate(tenantId, actor, { vertical: 'GASTRO', gastroProfileId: profileA, periodKey: '2026-11' });
    const missingGroup = s.summary.missingAgreementsByBenefit?.find((g) => g.benefitId === M.discountId);
    check(missingGroup?.usageCount === 2 && s.summary.missingAgreementUsageCount === 2, 'generate: PASS with missingAgreements grouped by discount (M = 2)');
    pA = await pendingOf(A.discountId);
    check(pA.data.every((r) => r.settlementId === s.id && r.settlementStatus === 'OPEN'), 'list: rows point to the generated settlement');

    // ── Scenario 10 — missing agreement isolation ──
    const pM = await pendingOf(M.discountId);
    check(pM.data.length === 2 && pM.data.every((r) => r.pricingStatus === 'MISSING_AGREEMENT' && !r.allocatable && r.blockedReason === 'MISSING_AGREEMENT'), 'S10: M validations listed (not hidden) as MISSING_AGREEMENT, not allocatable');
    const mixed = await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: [A.validationIds[0]!, vM[0]!] }));
    check(codeOf(mixed) === 'BENEFIT_SETTLEMENT_MISSING_AGREEMENTS', 'S10: selection A1 + M1 → FAIL (M1 has no contract)');
    check((await prisma.benefitSettlementUsageAllocation.count({ where: { tenantId } })) === 0, 'S10: failed selection allocates nothing (A1 untouched)');
    const allocA = await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: A.validationIds, gastroDiscountId: A.discountId });
    check(allocA.allocations.length === 3 && allocA.settlement.summary.cashDueCents === '1500000', 'S10: allocate A (priced) PASS while M has no contract');
    check(codeOf(await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: vM, gastroDiscountId: M.discountId }))) === 'BENEFIT_SETTLEMENT_MISSING_AGREEMENTS', 'S10: allocate M → FAIL');
    check((await prisma.benefitSettlementTransfer.count({ where: { tenantId } })) === 0, 'CASH allocation generates debt, never a payment');

    // ── Allocation isolation: discount guard ──
    const foreign = await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'BARTER', validationIds: [E.validationIds[0]!], gastroDiscountId: A.discountId }));
    check(codeOf(foreign) === 'BENEFIT_SETTLEMENT_VALIDATION_DISCOUNT_MISMATCH', 'isolation: E validation sent from discount A → DISCOUNT_MISMATCH');
    check((await prisma.benefitSettlementUsageAllocation.count({ where: { validationId: E.validationIds[0]! } })) === 0, 'isolation: nothing allocated on mismatch');

    // ── Scenario 8 — BARTER 4 × $5.000 × 2 ──
    const barter = await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'BARTER', validationIds: E.validationIds, gastroDiscountId: E.discountId });
    const barterIds = barter.allocations.map((a) => a.id);
    const credits = await ledgerCredits(barterIds);
    check(barter.allocations.every((a) => a.mode === 'BARTER') && barter.settlement.summary.barterBaseAmountCents === '2000000', 'S8: BARTER base $20.000');
    check(credits.length === 4 && credits.reduce((acc, c) => acc + c.amountCents, 0n) === 4000000n, 'S8: CREDIT_FROM_SETTLEMENT $40.000 (one per allocation)');
    check((await prisma.benefitSettlementTransfer.count({ where: { tenantId } })) === 0, 'S8: CANJE never creates a BenefitSettlementTransfer');
    const eSummary = await svc.summary.getForAdmin(tenantId, profileA, E.discountId);
    check(eSummary.barter.baseCents === '2000000' && eSummary.barter.creditGeneratedCents === '4000000' && eSummary.cash.generatedCents === '0', 'S8: economic summary base $20.000 / credit $40.000 / CASH 0');

    // ── Scenario 9 — duplicate barter (sequential + concurrent) ──
    check(codeOf(await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'BARTER', validationIds: E.validationIds, gastroDiscountId: E.discountId }))) === 'BENEFIT_SETTLEMENT_VALIDATION_NOT_PENDING', 'S9: retry same validations → NOT_PENDING');
    const E2 = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 500000n, uses: 2, validatedAt: '2026-11-08T15:00:00.000Z' });
    const race = await Promise.allSettled([1, 2].map(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'BARTER', validationIds: E2.validationIds, gastroDiscountId: E2.discountId })));
    check(race.filter((r) => r.status === 'fulfilled').length === 1, 'S9: concurrent duplicate BARTER → exactly one PASS');
    const e2Allocations = await prisma.benefitSettlementUsageAllocation.findMany({ where: { validationId: { in: E2.validationIds } } });
    check(e2Allocations.length === 2 && (await ledgerCredits(e2Allocations.map((a) => a.id))).length === 2, 'S9: no duplicated allocation nor ledger credit');
    check((await ledgerCredits(barterIds)).length === 4 && (await prisma.benefitSettlementUsageAllocation.count({ where: { validationId: { in: E.validationIds } } })) === 4, 'S9: original barter untouched (4 allocations, 4 credits)');

    // ── Scenario 11 — funded courtesy ──
    const pF = await pendingOf(F.discountId);
    check(!pF.billable && pF.data.every((r) => r.pricingStatus === 'FUNDED_COURTESY' && !r.allocatable), 'S11: funded courtesy not billable, no row allocatable');
    check(codeOf(await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: vF, gastroDiscountId: F.discountId }))) === 'BENEFIT_SETTLEMENT_VALIDATION_FUNDED_COURTESY', 'S11: CASH on funded courtesy → FAIL');
    check(codeOf(await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'BARTER', validationIds: vF }))) === 'BENEFIT_SETTLEMENT_VALIDATION_FUNDED_COURTESY', 'S11: BARTER on funded courtesy → FAIL');
    const fSummary = await svc.summary.getForAdmin(tenantId, profileA, F.discountId);
    check(fSummary.validations.pendingWithoutAgreement === 0 && fSummary.discount.settlementBillability === 'FUNDED_COURTESY_NOT_BILLABLE', 'S11: never MISSING_AGREEMENT');

    // ── allocate by count: only priced pending, never MISSING_AGREEMENT ──
    const A2 = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 300000n, uses: 2, validatedAt: '2026-11-09T15:00:00.000Z' });
    await svc.settlements.refresh(tenantId, actor, s.id);
    check(codeOf(await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', count: 3 }))) === 'BENEFIT_SETTLEMENT_INSUFFICIENT_PENDING_USAGES', 'count: 2 priced pending + 2 missing → count 3 rejected (missing never consumed)');
    const byCount = await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', count: 2 });
    check(byCount.allocations.every((a) => A2.validationIds.includes(a.validationId)), 'count: consumes only priced validations (A2)');
    check((await prisma.benefitSettlementUsageAllocation.count({ where: { validationId: { in: vM } } })) === 0, 'count: M validations never allocated');

    // ── close still blocks with billable usages without agreement ──
    check(codeOf(await errorOf(() => svc.settlements.close(tenantId, actor, s.id))) === 'BENEFIT_SETTLEMENT_MISSING_AGREEMENTS', 'close: blocked while M has usages without contract');

    // ── closed settlement: late validation is listed but not allocatable ──
    const X = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 500000n, uses: 1, validatedAt: '2026-10-10T15:00:00.000Z' });
    const sOct = await svc.settlements.generate(tenantId, actor, { vertical: 'GASTRO', gastroProfileId: profileA, periodKey: '2026-10' });
    await svc.settlements.allocate(tenantId, actor, sOct.id, { mode: 'CASH', validationIds: X.validationIds, gastroDiscountId: X.discountId });
    await svc.settlements.close(tenantId, actor, sOct.id);
    await redeemG10Uses(prisma, seed, { discountId: X.discountId, uses: 1, validatedAt: '2026-10-20T15:00:00.000Z' });
    const pX = await pendingOf(X.discountId);
    check(pX.data.length === 1 && pX.data[0]!.blockedReason === 'SETTLEMENT_CLOSED' && !pX.data[0]!.allocatable && pX.data[0]!.pricingStatus === 'PRICED', 'closed settlement: late validation listed as SETTLEMENT_CLOSED (not allocatable)');
  });

  console.log(`\nDB integration: ${result}`);
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G10.D allocation DB checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
