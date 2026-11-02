/**
 * G10.C2/C3 — per-discount economic summary against real PostgreSQL (scenarios A–I).
 * Run: pnpm --filter api run test:g10-discount-economic-summary-db
 */

import { GASTRO_DISCOUNT_ECONOMIC_REDACTED_KEYS } from '@yo-te-invito/shared';
import { codeOf, errorOf } from './lib/courtesy-fake-db';
import { cleanupG10Tenant, createG10Discount, seedG10Tenant, withG10Db } from './lib/g10-agreements-db-seed';
import {
  INTERNAL_AGREEMENT_NOTE,
  INTERNAL_TRANSFER_NOTE,
  PROOF_URL,
  buildGastroPortalEconomics,
  createGastroOwner,
  insertAttributedTransfer,
  seedEconomicSummaryScenarios,
  seedLegacyAllocation,
} from './lib/g10-economic-summary-db-scenarios';

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
    const fx = await seedEconomicSummaryScenarios(prisma, seed);
    const { svc, A, B, E, F, G } = fx;
    const { tenantId, profileA, profileB } = seed;
    const admin = (discountId: string) => svc.summary.getForAdmin(tenantId, profileA, discountId);

    // ── A — CASH generated EXACT ──
    let a = await admin(A.discountId);
    check(a.cash.generatedCents === '5000000' && a.cash.paidCents === '0' && a.cash.remainingCents === '5000000', 'A: generated $50.000 / paid $0 / remaining $50.000');
    check(a.cash.remainingPrecision === 'EXACT' && a.cash.usageCount === 10, 'A: 10 CASH uses, EXACT');
    check(a.validations.total === 10 && a.validations.allocated === 10 && a.validations.pending === 0, 'A: 10 validations, all allocated');
    check(a.agreement.current?.id === fx.agA.id && a.agreement.current.scope === 'DISCOUNT' && a.agreement.current.unitPriceCents === '500000', 'A: current contract = discount-scoped $5.000');
    check(a.agreement.legacyUsed.length === 0, 'A: no legacy agreement shown before a legacy allocation exists (local contracts never listed as own)');
    check(a.discount.settlementBillability === 'BILLABLE' && a.discount.isCourtesy === false, 'A: BILLABLE discount');

    // ── B — attributed payment $30.000 (+ reversed attributed payment ignored) ──
    await insertAttributedTransfer(prisma, seed, { settlementId: fx.settlementId, discountId: A.discountId, amountCents: 3000000n, reference: 'TRX-A-30' });
    await insertAttributedTransfer(prisma, seed, { settlementId: fx.settlementId, discountId: A.discountId, amountCents: 500000n, reference: 'TRX-A-REV', reversed: true });
    a = await admin(A.discountId);
    check(a.cash.generatedCents === '5000000' && a.cash.paidCents === '3000000' && a.cash.remainingCents === '2000000', 'B: generated $50.000 / paid $30.000 / remaining $20.000');
    check(a.cash.remainingPrecision === 'EXACT', 'B: EXACT (only attributed transfers in the settlement)');
    check(a.payments.length === 2 && a.payments.filter((p) => p.isActive).length === 1, 'B: payments list attributed transfers (active + reversed)');
    const reversed = a.payments.find((p) => !p.isActive);
    check(reversed?.reversalReason === 'monto erróneo' && reversed.reversedBy?.userId === seed.adminId, 'B: reversal reason and actor (ADMIN)');
    check(a.payments.some((p) => p.proofUrl === PROOF_URL && p.notes === INTERNAL_TRANSFER_NOTE && p.registeredBy?.label === 'G10 Admin'), 'B: ADMIN sees notes, proofUrl, registeredBy');
    const line = a.settlements.find((l) => l.settlementId === fx.settlementId)!;
    check(line.discountCollectionStatus === 'PARTIALLY_RECEIVED' && line.discountCashPaidCents === '3000000', 'B: settlement line discount-level paid $30.000');

    // ── C — A and B in the same settlement ──
    const b = await admin(B.discountId);
    check(b.cash.generatedCents === '3000000' && b.cash.paidCents === '0', 'C: B summary = $30.000 (A payment never counted for B)');
    check(a.cash.generatedCents !== '8000000' && b.cash.generatedCents !== '8000000', 'C: no individual summary shows $80.000');
    check(line.settlementCashDueCents === '8000000' && line.discountCashDueCents === '5000000' && line.containsOtherDiscounts, 'C: settlement-level $80.000 vs discount-level $50.000, contains other discounts');

    // ── D — legacy unattributed transfer in the same settlement ──
    await insertAttributedTransfer(prisma, seed, { settlementId: fx.settlementId, discountId: null, amountCents: 1000000n, reference: 'LEGACY' });
    a = await admin(A.discountId);
    const lineD = a.settlements.find((l) => l.settlementId === fx.settlementId)!;
    check(a.cash.paidCents === '3000000', 'D: paid = attributed only (legacy $10.000 not prorated)');
    check(a.cash.remainingCents === '2000000' && a.cash.remainingPrecision === 'SETTLEMENT_LEVEL', 'D: remaining $20.000 with SETTLEMENT_LEVEL precision');
    check(lineD.hasUnattributedTransfers && a.cash.unattributedSettlementReceivedCents === '1000000', 'D: hasUnattributedTransfers + unattributed $10.000');
    check(lineD.settlementCashReceivedCents === '4000000', 'D: settlement received = $30.000 + $10.000');
    check(!a.payments.some((p) => p.reference === 'LEGACY'), 'D: legacy transfer not listed as a discount payment');

    // ── E — BARTER base 20k × 2 = 40k (ledger) ──
    const e = await admin(E.discountId);
    check(e.barter.usageCount === 4 && e.barter.baseCents === '2000000' && e.barter.creditGeneratedCents === '4000000', 'E: barter base $20.000, credit generated $40.000');
    const lineE = e.settlements.find((l) => l.settlementId === fx.settlementId)!;
    check(e.cash.generatedCents === '0' && e.cash.remainingPrecision === 'EXACT' && lineE.hasUnattributedTransfers, 'E: no CASH owed → EXACT even with a legacy transfer in its settlement');
    check(lineE.discountBarterBaseCents === '2000000' && lineE.discountCashDueCents === '0', 'E: settlement line barter base $20.000, CASH 0');
    check(e.history.some((h) => h.kind === 'CREDIT_MATERIALIZED' && h.amountCents === '4000000'), 'E: history CREDIT_MATERIALIZED $40.000');
    check(e.partnerCredit?.precision === 'PARTNER_LEVEL', 'E: partner credit labeled PARTNER_LEVEL');

    // ── F — funded courtesy ──
    const f = await admin(F.discountId);
    check(f.validations.total === 2 && f.validations.fundedCourtesy === 2 && f.validations.billable === 0, 'F: 2 operational validations, not billable');
    check(f.cash.generatedCents === '0' && f.barter.baseCents === '0' && f.validations.pendingWithoutAgreement === 0, 'F: CASH 0, BARTER 0, pendingWithoutAgreement 0');
    check(f.discount.settlementBillability === 'FUNDED_COURTESY_NOT_BILLABLE' && f.discount.isCourtesy, 'F: FUNDED_COURTESY_NOT_BILLABLE');

    // ── G — ACTIVE discount without contract ──
    const g = await admin(G.discountId);
    check(g.agreement.current === null && g.agreement.history.length === 0, 'G: current agreement null (no crash)');
    check(g.validations.pending === 2 && g.validations.pendingWithoutAgreement === 2, 'G: pendingWithoutAgreement = 2');
    check(g.settlements.length === 0 && g.payments.length === 0, 'G: no settlements / payments');

    // ── H — legacy allocation keeps counting with its snapshot ──
    const legacyAllocation = await seedLegacyAllocation(prisma, seed, { discountId: A.discountId, legacyAgreementId: fx.legacy.id });
    a = await admin(A.discountId);
    check(a.agreement.legacyUsed.length === 1 && a.agreement.legacyUsed[0]!.agreement.id === fx.legacy.id, 'H: legacyUsed includes the legacy agreement');
    check(a.agreement.legacyUsed[0]!.precision === 'PARTNER_LEVEL_LEGACY' && a.agreement.legacyUsed[0]!.usageCount === 1, 'H: PARTNER_LEVEL_LEGACY with usage count');
    check(a.cash.generatedCents === '5999900', 'H: legacy CASH allocation still counts ($50.000 + $9.999)');
    const afterAlloc = await prisma.benefitSettlementUsageAllocation.findUniqueOrThrow({ where: { id: legacyAllocation.id } });
    check(afterAlloc.agreementId === fx.legacy.id, 'H: allocation agreementId never replaced');
    check(a.settlements.length === 2 && a.settlements[0]!.periodKey === '2026-11', 'H: two settlement lines, newest first');

    // ── History — persisted facts only ──
    const kinds = new Set(a.history.map((h) => h.kind));
    check(kinds.has('AGREEMENT_CREATED') && kinds.has('ALLOCATED_CASH') && kinds.has('PAYMENT_REGISTERED') && kinds.has('PAYMENT_REVERSED'), 'history: contract, allocations, payments, reversal');
    check(a.history.some((h) => h.kind === 'AGREEMENT_CREATED' && h.actorLabel === 'G10 Admin'), 'history: ADMIN actor label');
    const replaced = await fx.svc.auditedAgreements.replace(tenantId, fx.actor, fx.agA.id, { effectiveFrom: '2027-01-01', unitPriceCents: '600000', barterMultiplier: '2', currency: 'ARS' });
    await fx.svc.auditedAgreements.close(tenantId, fx.actor, replaced.created.id, { validTo: '2027-06-30' });
    a = await admin(A.discountId);
    check(a.history.some((h) => h.kind === 'AGREEMENT_REPLACED' && h.replacedAgreementId === fx.agA.id), 'history: AGREEMENT_REPLACED from audit');
    check(a.history.some((h) => h.kind === 'AGREEMENT_CLOSED' && h.effectiveDate === '2027-06-30'), 'history: AGREEMENT_CLOSED with end date');
    check(a.agreement.history.length === 2 && a.agreement.current?.id === fx.agA.id, 'contract history = 2 discount rows; current still the Nov contract');

    // ── I — ADMIN cross-profile / cross-tenant ──
    check(codeOf(await errorOf(() => svc.summary.getForAdmin(tenantId, profileB, A.discountId))) === 'NOT_FOUND', 'I: profile B URL + discount A → 404');
    check(codeOf(await errorOf(() => svc.summary.getForAdmin(tenantId, '', A.discountId))) === 'NOT_FOUND', 'I: empty profile → 404');
    const other = await seedG10Tenant(prisma);
    try {
      check(codeOf(await errorOf(() => svc.summary.getForAdmin(other.tenantId, profileA, A.discountId))) === 'NOT_FOUND', 'I: other tenant → 404');
      check(codeOf(await errorOf(() => svc.summary.getForAdmin(other.tenantId, other.profileA, A.discountId))) === 'NOT_FOUND', 'I: other tenant own profile + discount A → 404');
    } finally {
      await cleanupG10Tenant(prisma, other.tenantId);
    }

    // ── C3 — GASTRO read-only endpoint: ownership + redaction ──
    const portal = buildGastroPortalEconomics(prisma, svc.summary);
    const ownerA = await createGastroOwner(prisma, seed, profileA, 'A');
    const ownerB = await createGastroOwner(prisma, seed, profileB, 'B');
    const noLocal = await createGastroOwner(prisma, seed, null, 'none');
    await prisma.user.update({ where: { id: noLocal }, data: { role: 'USER' } });
    const discountOfB = await createG10Discount(prisma, seed, { profileId: profileB, eventId: seed.eventB });
    const asOwner = (userId: string, discountId: string, tenant = tenantId) =>
      portal.getSummary(tenant, userId, 'GASTRO_OWNER', discountId);

    const gastroA = await asOwner(ownerA, A.discountId);
    check(gastroA.audience === 'GASTRO' && gastroA.discount.id === A.discountId, 'C3: owner A → discount A PASS');
    check(
      gastroA.cash.generatedCents === a.cash.generatedCents && gastroA.cash.paidCents === a.cash.paidCents && gastroA.cash.remainingCents === a.cash.remainingCents && gastroA.cash.remainingPrecision === a.cash.remainingPrecision,
      'C3: GASTRO figures = ADMIN figures (same domain service)',
    );
    const gastroJson = JSON.stringify(gastroA);
    check(GASTRO_DISCOUNT_ECONOMIC_REDACTED_KEYS.every((k) => !gastroJson.includes(`"${k}"`)), 'C3 redaction: no notes / proofUrl / registeredBy / reversedBy / actors / tenantId keys');
    check(!gastroJson.includes(INTERNAL_AGREEMENT_NOTE) && !gastroJson.includes(INTERNAL_TRANSFER_NOTE) && !gastroJson.includes(PROOF_URL) && !gastroJson.includes('G10 Admin') && !gastroJson.includes(seed.adminId), 'C3 redaction: no internal note, proof URL, admin name or admin id values');
    check(gastroA.payments.some((p) => p.reference === 'TRX-A-30' && p.amountCents === '3000000' && Boolean(p.transferredAt)), 'C3: payment date / amount / reference visible');
    check(gastroA.agreement.current?.unitPriceCents === '500000' && gastroA.agreement.legacyUsed[0]?.precision === 'PARTNER_LEVEL_LEGACY', 'C3: contract terms + legacy precision visible');
    check(gastroA.partnerCredit?.precision === 'PARTNER_LEVEL', 'C3: local credit balance only as PARTNER_LEVEL');
    check(!gastroJson.includes('creditConsumed'), 'C3: no credit consumed per discount');

    check(codeOf(await errorOf(() => asOwner(ownerA, discountOfB.discountId))) === 'FORBIDDEN', 'C3: owner A → discount of local B FAIL (403)');
    check(codeOf(await errorOf(() => asOwner(ownerB, A.discountId))) === 'FORBIDDEN', 'C3: other GASTRO owner → discount A FAIL (403)');
    check(codeOf(await errorOf(() => asOwner(noLocal, A.discountId))) === 'FORBIDDEN', 'C3: user without gastro access FAIL (403)');
    check(codeOf(await errorOf(() => asOwner(ownerA, 'missing-discount'))) === 'NOT_FOUND', 'C3: unknown discount → 404');
    const otherTenant = await seedG10Tenant(prisma);
    try {
      const crossTenant = codeOf(await errorOf(() => asOwner(ownerA, A.discountId, otherTenant.tenantId)));
      check(crossTenant === 'FORBIDDEN' || crossTenant === 'NOT_FOUND', `C3: cross-tenant → FAIL (${crossTenant})`);
      check(codeOf(await errorOf(() => svc.summary.getForGastro(tenantId, profileB, A.discountId))) === 'NOT_FOUND', 'C3: service re-checks the owned profile (defense in depth)');
    } finally {
      await cleanupG10Tenant(prisma, otherTenant.tenantId);
    }
  });

  console.log(`\nDB integration: ${result}`);
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G10.C economic summary DB checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
