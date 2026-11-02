/**
 * G10.E1 — reporting precision + integrity as one release unit, against real PostgreSQL.
 * Run: pnpm --filter api run test:g10-release-reporting-integrity-db
 */

import { benefitSettlementAuditResponseSchema } from '@yo-te-invito/shared';
import { codeOf, errorOf } from './lib/courtesy-fake-db';
import { createG10Discount, fundG10Courtesy, redeemG10Uses, withG10Db } from './lib/g10-agreements-db-seed';
import { buildPaymentServices, cashBody, pricedDiscount } from './lib/g10-discount-payments-db-scenarios';
import { BenefitSettlementReportingService } from '../src/modules/benefit-settlements/benefit-settlement-reporting.service';
import { runBenefitIntegrityAudit } from '../src/modules/benefit-settlements/benefit-settlement-integrity-audit.runner';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

const G10_INTEGRITY_CODES = [
  'AGREEMENT_SCOPE_MISMATCH',
  'DISCOUNT_CASH_OVERPAYMENT',
  'TRANSFER_DISCOUNT_SCOPE_MISMATCH',
  'FUNDED_COURTESY_ALLOCATED',
  'ALLOCATION_AGREEMENT_DISCOUNT_MISMATCH',
];

async function main() {
  const result = await withG10Db(async (prisma, seed) => {
    const svc = buildPaymentServices(prisma);
    const reporting = new BenefitSettlementReportingService(prisma, svc.settlements, svc.integrity, svc.ledger);
    const { tenantId, profileA, profileB } = seed;
    const actor = { id: seed.adminId, role: 'ADMIN' };
    const onA = { profileId: profileA, eventId: seed.eventA };
    const summary = (discountId: string) => svc.summary.getForAdmin(tenantId, profileA, discountId);

    // ── Fixture: same local, same period — A $5.000 CASH, B $7.500 CANJE ×2, F funded courtesy ──
    const A = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 500000n, uses: 10, validatedAt: '2026-11-02T15:00:00.000Z' });
    const B = await pricedDiscount(prisma, seed, { ...onA, unitPriceCents: 750000n, multiplier: '2', uses: 4, validatedAt: '2026-11-03T15:00:00.000Z' });
    const F = await createG10Discount(prisma, seed, { ...onA, courtesy: true });
    await fundG10Courtesy(prisma, svc.ledger, seed, { profileId: profileA, campaignId: F.campaignId!, imputedValueCents: 100000n });
    const fValidations = await redeemG10Uses(prisma, seed, { discountId: F.discountId, campaignId: F.campaignId, uses: 2, validatedAt: '2026-11-04T15:00:00.000Z' });

    const s = await svc.settlements.generate(tenantId, actor, { vertical: 'GASTRO', gastroProfileId: profileA, periodKey: '2026-11' });
    await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: A.validationIds, gastroDiscountId: A.discountId });
    await svc.settlements.allocate(tenantId, actor, s.id, { mode: 'BARTER', validationIds: B.validationIds, gastroDiscountId: B.discountId });
    check(
      codeOf(await errorOf(() => svc.settlements.allocate(tenantId, actor, s.id, { mode: 'CASH', validationIds: fValidations }))) ===
        'BENEFIT_SETTLEMENT_VALIDATION_FUNDED_COURTESY',
      'D1: funded courtesy validations are not allocatable (CASH)',
    );
    const t30 = await svc.transfers.register(tenantId, actor, s.id, cashBody('3000000', A.discountId, 'A-30'));
    const legacy = await prisma.benefitSettlementTransfer.create({
      data: { tenantId, settlementId: s.id, gastroDiscountId: null, amountCents: 500000n, transferredAt: new Date('2026-11-20T15:00:00.000Z'), reference: 'LEGACY', registeredByUserId: seed.adminId },
    });

    // ── Precision: CASH by discount = CASH allocations + attributed transfers only ──
    const a = await summary(A.discountId);
    check(a.cash.generatedCents === '5000000' && a.cash.paidCents === '3000000' && a.cash.remainingCents === '2000000', 'CASH A: generated 50.000 / paid 30.000 / remaining 20.000');
    check(a.cash.remainingPrecision === 'SETTLEMENT_LEVEL' && a.cash.unattributedSettlementReceivedCents === '500000', 'legacy: A remaining degrades to SETTLEMENT_LEVEL, legacy 5.000 reported apart');
    check(a.payments.length === 1 && a.payments[0].transferId === t30.id, 'legacy: never listed as a discount payment (paid stays exact)');
    check(a.agreement.current?.unitPriceCents === '500000' && a.agreement.current.scope === 'DISCOUNT', 'pricing: A contract $5.000 (DISCOUNT)');

    const b = await summary(B.discountId);
    check(b.agreement.current?.unitPriceCents === '750000', 'pricing: B contract $7.500 (independent from A, same local + period)');
    check(b.barter.usageCount === 4 && b.barter.baseCents === '3000000' && b.barter.creditGeneratedCents === '6000000', 'CANJE B: base 30.000 / credit generated 60.000 (EXACT)');
    check(b.cash.generatedCents === '0' && b.cash.paidCents === '0' && b.cash.remainingPrecision === 'EXACT', 'CANJE B: no CASH; EXACT even with a legacy transfer in its settlement');
    check(!JSON.stringify(b).includes('creditConsumed'), 'CANJE: creditConsumedByDiscount NOT exposed (NOT_ATTRIBUTABLE)');
    check(b.partnerCredit?.precision === 'PARTNER_LEVEL', 'CANJE: partner balance labelled PARTNER_LEVEL');

    const f = await svc.summary.getForAdmin(tenantId, profileA, F.discountId);
    check(f.discount.settlementBillability === 'FUNDED_COURTESY_NOT_BILLABLE', 'D1: funded courtesy not billable');
    check(f.cash.generatedCents === '0' && f.barter.baseCents === '0' && f.validations.fundedCourtesy === 2 && f.validations.pendingWithoutAgreement === 0, 'D1: funded courtesy operational (2 uses) with CASH 0 / BARTER 0 / never MISSING_AGREEMENT');

    // ── Settlement-level reporting keeps its own scope (never mixed with discount-level) ──
    const monthly = await reporting.getMonthly(tenantId, { periodKey: '2026-11', vertical: 'GASTRO' });
    check(
      monthly.kpis.cashAllocatedCents === '5000000' && monthly.kpis.cashReceivedCents === '3500000' && monthly.kpis.barterBaseCents === '3000000',
      'monthly: settlement-level CASH 50.000 / received 35.000 (attributed + legacy) / barter 30.000',
    );
    const auditView = benefitSettlementAuditResponseSchema.parse(await reporting.getSettlementAudit(tenantId, s.id));
    const exactRow = auditView.transfers.find((t) => t.transferId === t30.id);
    const legacyRow = auditView.transfers.find((t) => t.transferId === legacy.id);
    check(exactRow?.attribution === 'EXACT' && exactRow.gastroDiscountId === A.discountId, 'audit view: attributed transfer EXACT with gastroDiscountId');
    check(legacyRow?.attribution === 'SETTLEMENT_LEVEL' && legacyRow.gastroDiscountId === null, 'audit view: legacy transfer SETTLEMENT_LEVEL (no inference)');

    // ── Integrity: clean after guarded writes ──
    const clean = await runBenefitIntegrityAudit(prisma, { tenantId });
    const cleanTenant = clean.tenants[0];
    check(clean.status === 'OK' && cleanTenant.agreementScopeIssues.length === 0 && cleanTenant.checked === 1, 'integrity: guarded writes → OK, agreementScopeIssues = []');

    // ── Integrity: corrupt rows inserted behind the guards ──
    const bDiscount = await pricedDiscount(prisma, seed, { profileId: profileB, eventId: seed.eventB, unitPriceCents: 500000n, uses: 1, validatedAt: '2026-11-05T15:00:00.000Z' });
    const badAgreement = await prisma.benefitCommercialAgreement.create({
      data: { tenantId, vertical: 'GASTRO', gastroProfileId: profileB, gastroDiscountId: A.discountId, unitPriceCents: 1n, barterMultiplier: '1', validFrom: new Date('2030-01-01T03:00:00.000Z'), createdByUserId: seed.adminId },
    });
    const overpay = await prisma.benefitSettlementTransfer.create({
      data: { tenantId, settlementId: s.id, gastroDiscountId: A.discountId, amountCents: 2500000n, transferredAt: new Date('2026-11-26T15:00:00.000Z'), reference: 'FORCED-OVERPAY' },
    });
    const crossLocal = await prisma.benefitSettlementTransfer.create({
      data: { tenantId, settlementId: s.id, gastroDiscountId: bDiscount.discountId, amountCents: 100n, transferredAt: new Date('2026-11-26T15:00:00.000Z'), reference: 'FORCED-CROSS' },
    });
    const aAgreementId = a.agreement.current!.id;
    const fundedAlloc = await prisma.benefitSettlementUsageAllocation.create({
      data: { tenantId, settlementId: s.id, validationSource: 'GASTRO_DISCOUNT_VALIDATION', validationId: fValidations[0], mode: 'CASH', agreementId: aAgreementId, unitPriceCents: 500000n, barterMultiplier: '2', baseAmountCents: 500000n },
    });

    const snapshot = async () => ({
      agreements: await prisma.benefitCommercialAgreement.findMany({ where: { tenantId }, orderBy: { id: 'asc' } }),
      transfers: await prisma.benefitSettlementTransfer.findMany({ where: { tenantId }, orderBy: { id: 'asc' } }),
      allocations: await prisma.benefitSettlementUsageAllocation.findMany({ where: { tenantId }, orderBy: { id: 'asc' } }),
      ledger: await prisma.courtesyCreditLedgerEntry.findMany({ where: { tenantId }, orderBy: { id: 'asc' } }),
      audits: await prisma.auditLog.count({ where: { tenantId } }),
    });
    const before = JSON.stringify(await snapshot(), (_k, v) => (typeof v === 'bigint' ? v.toString() : v));

    const dirty = await runBenefitIntegrityAudit(prisma, { tenantId });
    const t = dirty.tenants[0];
    check(dirty.status === 'ERROR', 'integrity: corrupt rows → ERROR');
    for (const code of G10_INTEGRITY_CODES) check((t.issueCounts[code] ?? 0) > 0, `integrity: ${code} detected`);
    check(t.agreementScopeIssues.some((i) => i.entityId === badAgreement.id), 'integrity: AGREEMENT_SCOPE_MISMATCH names the cross-profile agreement');
    const sIssues = t.settlementsWithIssues.find((r) => r.settlementId === s.id)?.issues ?? [];
    check(sIssues.some((i) => i.code === 'TRANSFER_DISCOUNT_SCOPE_MISMATCH' && i.entityId === crossLocal.id), 'integrity: TRANSFER_DISCOUNT_SCOPE_MISMATCH names the cross-local transfer');
    check(sIssues.some((i) => i.code === 'FUNDED_COURTESY_ALLOCATED' && i.entityId === fundedAlloc.id), 'integrity: FUNDED_COURTESY_ALLOCATED names the allocation');
    check(sIssues.some((i) => i.code === 'CASH_OVERPAYMENT'), 'integrity: settlement-level CASH_OVERPAYMENT still reported');

    const after = JSON.stringify(await snapshot(), (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
    check(before === after, 'integrity: read-only — agreements, transfers, allocations, ledger and audit log unchanged (no auto-repair)');
    const overpayAfter = await prisma.benefitSettlementTransfer.findUnique({ where: { id: overpay.id } });
    check(overpayAfter?.reversedAt === null && overpayAfter.amountCents === 2500000n, 'integrity: corrupt transfer left as-is for manual review');
  });

  console.log(`\nDB integration: ${result}`);
  if (failures > 0) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
  }
  if (result === 'NOT_RUN') {
    console.log('\nG10.E1 reporting/integrity DB checks NOT RUN (no PostgreSQL).');
    return;
  }
  console.log('\nAll G10.E1 reporting/integrity DB checks passed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
