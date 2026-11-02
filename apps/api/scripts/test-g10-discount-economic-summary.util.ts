/**
 * G10.C1 — pure precision model of the per-discount economic summary (no DB).
 * Run: pnpm --filter api run test:g10-discount-economic-summary
 */

import {
  GASTRO_DISCOUNT_ECONOMIC_REDACTED_KEYS,
  buildDiscountEconomicHistory,
  buildDiscountSettlementLines,
  countDiscountEconomicValidations,
  gastroDiscountEconomicSummaryAdminSchema,
  redactGastroDiscountEconomicSummaryForGastro,
  summarizeDiscountBarter,
  summarizeDiscountCash,
  type DiscountEconomicAllocationInput,
  type DiscountEconomicSettlementInput,
  type DiscountEconomicTransferInput,
  type GastroDiscountEconomicSummaryAdmin,
} from '@yo-te-invito/shared';

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures += 1;
    console.error('FAIL:', msg);
    return;
  }
  console.log('OK:', msg);
}

const A = 'disc-A';
const B = 'disc-B';

function allocs(prefix: string, settlementId: string, n: number, mode: 'CASH' | 'BARTER', base: bigint) {
  return Array.from({ length: n }, (_, i): DiscountEconomicAllocationInput => ({
    id: `${prefix}-${i}`,
    settlementId,
    validationId: `${prefix}-v${i}`,
    mode,
    baseAmountCents: base,
  }));
}

function transfer(id: string, discountId: string | null, amount: bigint, reversed = false): DiscountEconomicTransferInput {
  return { id, gastroDiscountId: discountId, amountCents: amount, reversedAt: reversed ? new Date() : null };
}

function summarize(discountId: string, own: DiscountEconomicAllocationInput[], settlements: DiscountEconomicSettlementInput[]) {
  const lines = buildDiscountSettlementLines({
    discountId,
    discountAllocationIds: new Set(own.map((a) => a.id)),
    settlements,
  });
  return { lines, cash: summarizeDiscountCash({ allocations: own, lines }) };
}

// ── Scenario A — 10 CASH × $5.000 ──
const aCash = allocs('a', 'S1', 10, 'CASH', 500000n);
{
  const { cash, lines } = summarize(A, aCash, [{ id: 'S1', periodKey: '2026-11', status: 'ALLOCATED', allocations: aCash, transfers: [] }]);
  check(cash.generatedCents === '5000000' && cash.paidCents === '0' && cash.remainingCents === '5000000', 'A: generated $50.000 / paid 0 / remaining $50.000');
  check(cash.remainingPrecision === 'EXACT' && cash.usageCount === 10, 'A: EXACT, 10 CASH uses');
  check(lines[0]!.discountCollectionStatus === 'PENDING', 'A: discount collection PENDING');
}

// ── Scenario B — attributed payment $30.000 (+ reversed one ignored) ──
{
  const transfers = [transfer('t1', A, 3000000n), transfer('t2', A, 1000000n, true)];
  const { cash, lines } = summarize(A, aCash, [{ id: 'S1', periodKey: '2026-11', status: 'ALLOCATED', allocations: aCash, transfers }]);
  check(cash.paidCents === '3000000' && cash.remainingCents === '2000000' && cash.remainingPrecision === 'EXACT', 'B: paid $30.000 / remaining $20.000 EXACT (reversed excluded)');
  check(lines[0]!.discountCollectionStatus === 'PARTIALLY_RECEIVED', 'B: discount PARTIALLY_RECEIVED');
}

// ── Scenario C — A (50k) and B (30k) in the same settlement ──
{
  const bCash = allocs('b', 'S1', 6, 'CASH', 500000n);
  const shared: DiscountEconomicSettlementInput = { id: 'S1', periodKey: '2026-11', status: 'ALLOCATED', allocations: [...aCash, ...bCash], transfers: [] };
  const ra = summarize(A, aCash, [shared]);
  const rb = summarize(B, bCash, [shared]);
  check(ra.cash.generatedCents === '5000000' && rb.cash.generatedCents === '3000000', 'C: A = $50.000, B = $30.000 (never $80.000)');
  check(ra.lines[0]!.discountCashDueCents === '5000000' && ra.lines[0]!.settlementCashDueCents === '8000000', 'C: discount-level 50k vs settlement-level 80k');
  check(ra.lines[0]!.containsOtherDiscounts && rb.lines[0]!.containsOtherDiscounts, 'C: settlement flagged as containing other discounts');
}

// ── Scenario D — legacy unattributed transfer in the settlement ──
{
  const transfers = [transfer('t1', A, 1000000n), transfer('legacy', null, 2500000n), transfer('legacy-rev', null, 999n, true)];
  const { cash, lines } = summarize(A, aCash, [{ id: 'S1', periodKey: '2026-11', status: 'ALLOCATED', allocations: aCash, transfers }]);
  check(cash.paidCents === '1000000', 'D: paid = attributed transfers only (legacy never prorated)');
  check(cash.remainingCents === '4000000' && cash.remainingPrecision === 'SETTLEMENT_LEVEL', 'D: remaining keeps generated − attributed, precision SETTLEMENT_LEVEL');
  check(cash.unattributedSettlementReceivedCents === '2500000' && lines[0]!.hasUnattributedTransfers, 'D: unattributed $25.000 reported (active only)');
  check(lines[0]!.settlementCashReceivedCents === '3500000', 'D: settlement received = all active transfers');
  const barterOnly = allocs('x', 'S2', 1, 'BARTER', 100n);
  const r2 = summarize(A, barterOnly, [{ id: 'S2', periodKey: '2026-12', status: 'ALLOCATED', allocations: barterOnly, transfers: [transfer('l2', null, 5n)] }]);
  check(r2.cash.remainingPrecision === 'EXACT', 'D: unattributed transfer where the discount owes no CASH keeps EXACT');
}

// ── Scenario E — BARTER base 20k, credit from ledger ──
{
  const barter = allocs('e', 'S1', 4, 'BARTER', 500000n);
  const result = summarizeDiscountBarter({ allocations: barter, ledgerCreditGeneratedCents: 4000000n });
  check(result.baseCents === '2000000' && result.creditGeneratedCents === '4000000' && result.usageCount === 4, 'E: base $20.000, credit $40.000 (ledger), 4 uses');
}

// ── Scenarios F / G — validation counts ──
{
  const validations = Array.from({ length: 3 }, (_, i) => ({ id: `v${i}`, claimId: `c${i}`, validatedAt: new Date('2026-11-05T15:00:00.000Z') }));
  const master = { id: 'vm', claimId: null, validatedAt: new Date('2026-11-05T15:00:00.000Z') };
  const funded = countDiscountEconomicValidations({ validations: [...validations, master], allocatedValidationIds: new Set(), billable: false, agreements: [] });
  check(funded.total === 3 && funded.fundedCourtesy === 3 && funded.billable === 0, 'F: funded courtesy validations counted as operational (master QR excluded)');
  check(funded.pending === 0 && funded.pendingWithoutAgreement === 0, 'F: funded → pending 0, pendingWithoutAgreement 0');
  const noContract = countDiscountEconomicValidations({ validations, allocatedValidationIds: new Set(['v0']), billable: true, agreements: [] });
  check(noContract.allocated === 1 && noContract.pending === 2 && noContract.pendingWithoutAgreement === 2, 'G: no contract → pendingWithoutAgreement 2');
  const covered = countDiscountEconomicValidations({ validations, allocatedValidationIds: new Set(), billable: true, agreements: [{ id: 'ag', validFromKey: '2026-11-01', validToKey: null }] });
  check(covered.pending === 3 && covered.pendingWithoutAgreement === 0, 'G: covered by discount contract → 0 without agreement');
  const expired = countDiscountEconomicValidations({ validations, allocatedValidationIds: new Set(), billable: true, agreements: [{ id: 'ag', validFromKey: '2026-01-01', validToKey: '2026-10-31' }] });
  check(expired.pendingWithoutAgreement === 3, 'G: contract expired before validatedAt → without agreement');
}

// ── History — only persisted facts ──
const allocatedAt = new Date('2026-11-10T12:00:10.000Z');
const history = buildDiscountEconomicHistory({
  agreements: [
    { id: 'ag1', createdAt: new Date('2026-10-01T12:00:00.000Z'), validFrom: '2026-10-01', createdByUserId: 'u1' },
    { id: 'ag2', createdAt: new Date('2026-11-01T12:00:00.000Z'), validFrom: '2026-11-01', createdByUserId: 'u1' },
  ],
  agreementAudits: [
    { action: 'BENEFIT_AGREEMENT_REPLACED', entityId: 'ag2', createdAt: new Date('2026-11-01T12:00:00.000Z'), actorId: 'u1', validTo: null, replacedAgreementId: 'ag1' },
  ],
  allocations: [
    ...[0, 1, 2].map((i) => ({ id: `al${i}`, settlementId: 'S1', periodKey: '2026-11', mode: 'CASH', baseAmountCents: 500000n, allocatedAt: new Date(allocatedAt.getTime() + i * 100), allocatedByUserId: 'u1' })),
    { id: 'alb', settlementId: 'S1', periodKey: '2026-11', mode: 'BARTER', baseAmountCents: 500000n, allocatedAt, allocatedByUserId: 'u1' },
  ],
  credits: [{ id: 'cr', sourceAllocationId: 'alb', amountCents: 1000000n, createdAt: allocatedAt, createdByUserId: 'u1' }],
  transfers: [
    { id: 't1', settlementId: 'S1', periodKey: '2026-11', amountCents: 300000n, transferredAt: new Date('2026-11-20T15:00:00.000Z'), reference: 'TRX-1', createdAt: new Date('2026-11-20T16:00:00.000Z'), registeredByUserId: 'u1', reversedAt: new Date('2026-11-21T10:00:00.000Z'), reversedByUserId: 'u1', reversalReason: 'error' },
  ],
  actorLabels: new Map([['u1', 'Admin Uno']]),
});
const kinds = history.map((e) => e.kind);
check(kinds.filter((k) => k === 'AGREEMENT_CREATED').length === 1 && kinds.includes('AGREEMENT_REPLACED'), 'history: created + replaced (replacement row not duplicated as created)');
const cashEvent = history.find((e) => e.kind === 'ALLOCATED_CASH');
check(cashEvent?.usageCount === 3 && cashEvent.amountCents === '1500000', 'history: one allocate call collapsed (3 uses, real total)');
check(kinds.includes('ALLOCATED_BARTER') && kinds.includes('CREDIT_MATERIALIZED'), 'history: barter allocation + credit materialized');
check(kinds.includes('PAYMENT_REGISTERED') && kinds.includes('PAYMENT_REVERSED'), 'history: payment registered + reversed');
check(history.every((e, i) => i === 0 || history[i - 1]!.at <= e.at), 'history: chronological');

// ── Redaction — GASTRO projection strips internal fields ──
const adminSummary: GastroDiscountEconomicSummaryAdmin = gastroDiscountEconomicSummaryAdminSchema.parse({
  audience: 'ADMIN',
  currency: 'ARS',
  discount: { id: A, gastroProfileId: 'p', title: 'A', status: 'ACTIVE', visibility: 'PUBLIC', isCourtesy: false, settlementBillability: 'BILLABLE' },
  agreement: {
    current: { id: 'ag2', tenantId: 't', vertical: 'GASTRO', gastroProfileId: 'p', gastroDiscountId: A, excursionOperatorId: null, scope: 'DISCOUNT', derivedFromAgreementId: null, partnerDisplayName: 'L', discountTitle: 'A', discountStatus: 'ACTIVE', unitPriceCents: '500000', barterMultiplier: '2', currency: 'ARS', validFrom: '2026-11-01', validTo: null, vigency: 'CURRENT', isOpen: true, notes: 'interna', createdByUserId: 'u1', createdAt: '2026-11-01T12:00:00.000Z', updatedAt: '2026-11-01T12:00:00.000Z' },
    history: [],
    legacyUsed: [],
  },
  validations: { total: 0, billable: 0, fundedCourtesy: 0, allocated: 0, pending: 0, pendingWithoutAgreement: 0 },
  cash: { usageCount: 0, generatedCents: '0', paidCents: '0', remainingCents: '0', remainingPrecision: 'EXACT', unattributedSettlementReceivedCents: '0' },
  barter: { usageCount: 0, baseCents: '0', creditGeneratedCents: '0' },
  settlements: [],
  payments: [{ transferId: 't1', settlementId: 'S1', periodKey: '2026-11', amountCents: '300000', currency: 'ARS', transferredAt: '2026-11-20T15:00:00.000Z', reference: 'TRX-1', isActive: true, reversedAt: null, reversalReason: null, notes: 'nota interna', proofUrl: 'https://x/proof.pdf', registeredBy: { userId: 'u1', label: 'Admin Uno' }, reversedBy: null }],
  history: history,
  partnerCredit: { precision: 'PARTNER_LEVEL', currency: 'ARS', balanceAvailableCents: '1000' },
});
const gastro = redactGastroDiscountEconomicSummaryForGastro(adminSummary);
const json = JSON.stringify(gastro);
check(gastro.audience === 'GASTRO', 'redaction: audience GASTRO');
check(GASTRO_DISCOUNT_ECONOMIC_REDACTED_KEYS.every((k) => !json.includes(`"${k}"`)), 'redaction: no notes / proofUrl / actors / tenant keys');
check(!json.includes('nota interna') && !json.includes('interna') && !json.includes('Admin Uno') && !json.includes('proof.pdf'), 'redaction: no internal values');
check(gastro.payments[0]!.reference === 'TRX-1' && gastro.payments[0]!.amountCents === '300000', 'redaction: date / amount / reference kept');
check(gastro.agreement.current?.unitPriceCents === '500000' && gastro.history.length === history.length, 'redaction: contract terms and timeline kept');
check(!('creditConsumedByDiscount' in gastro.barter) && !json.includes('creditConsumed'), 'no credit consumed per discount (NOT_ATTRIBUTABLE)');

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log('\nAll G10.C1 economic summary precision checks passed.');
