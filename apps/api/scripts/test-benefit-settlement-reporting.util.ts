/**
 * Benefit settlement reporting helpers (no DB).
 * Run: pnpm --filter api run test:benefit-settlement-reporting
 */

import {
  addMoneyCentsField,
  checkCashOverpayment,
  checkClosedWithPendingUsages,
  checkOrphanAllocation,
  checkPartnerMismatchAllocation,
  compareBenefitTimelineEvents,
  deriveIntegrityStatus,
  emptyBenefitReportingKpis,
  mergeBenefitReportingKpis,
  runBarterCreditDriftCheck,
  sortBenefitTimelineEvents,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const kpisA = {
  ...emptyBenefitReportingKpis(),
  usageCount: 10,
  baseGeneratedCents: '10000000',
  cashReceivedCents: '5000000',
  barterCreditMaterializedCents: '10000000',
};
const kpisB = {
  ...emptyBenefitReportingKpis(),
  usageCount: 5,
  cashReceivedCents: '2500000',
  barterCreditMaterializedCents: '5000000',
};
const merged = mergeBenefitReportingKpis(kpisA, kpisB);
assert(merged.usageCount === 15, 'usage count merged');
assert(
  merged.cashReceivedCents === addMoneyCentsField('5000000', '2500000'),
  'cash received bigint merge',
);
assert(
  merged.barterCreditMaterializedCents === '15000000',
  'barter credit separate field',
);

const noTotalField = Object.keys(merged).every((k) => !k.toLowerCase().includes('total'));
assert(noTotalField, 'no combined cash+credit total KPI');

assert(
  checkCashOverpayment(
    [{ mode: 'CASH', baseAmountCents: 5000000n }],
    [{ amountCents: 6000000n, reversedAt: null }],
    's1',
  )?.code === 'CASH_OVERPAYMENT',
  'overpayment is ERROR',
);

assert(
  checkCashOverpayment(
    [{ mode: 'CASH', baseAmountCents: 5000000n }],
    [{ amountCents: 2500000n, reversedAt: null }],
    's1',
  ) === null,
  'partial cash is NOT error',
);

assert(
  checkClosedWithPendingUsages('OPEN', 5, 's1') === null,
  'open with pending is NOT error',
);

assert(
  checkClosedWithPendingUsages('CLOSED', 2, 's1')?.code === 'CLOSED_WITH_PENDING_USAGES',
  'closed with pending is ERROR',
);

const driftIssues = runBarterCreditDriftCheck({
  barterAllocations: [
    {
      id: 'a1',
      mode: 'BARTER',
      baseAmountCents: 500000n,
      barterMultiplier: '2',
    },
  ],
  creditEntries: [],
});
assert(driftIssues.length === 1, 'missing credit drift detected');
assert(deriveIntegrityStatus(driftIssues) === 'ERROR', 'drift => ERROR integrity');

const timeline = sortBenefitTimelineEvents([
  {
    occurredAt: '2026-08-02T10:00:00.000Z',
    kind: 'TRANSFER',
    label: 'b',
    tieBreak: 'b',
  },
  {
    occurredAt: '2026-08-01T10:00:00.000Z',
    kind: 'SETTLEMENT',
    label: 'a',
    tieBreak: 'a',
  },
]);
assert(timeline[0]!.label === 'a', 'timeline chronological');
assert(compareBenefitTimelineEvents(timeline[0]!, timeline[1]!) < 0, 'compare timeline');

assert(
  mergeBenefitReportingKpis(
    { ...emptyBenefitReportingKpis(), cashReceivedCents: '5000000' },
    { ...emptyBenefitReportingKpis(), barterCreditMaterializedCents: '10000000' },
  ).cashReceivedCents === '5000000' &&
    mergeBenefitReportingKpis(
      { ...emptyBenefitReportingKpis(), cashReceivedCents: '5000000' },
      { ...emptyBenefitReportingKpis(), barterCreditMaterializedCents: '10000000' },
    ).barterCreditMaterializedCents === '10000000',
  'cash 50k + credit 100k kept separate',
);

assert(
  checkOrphanAllocation({
    allocationId: 'a1',
    validationSource: 'ACTIVITY_COUPON_VALIDATION',
    validationId: 'x',
    validationExists: false,
  })?.severity === 'ERROR',
  'orphan allocation severity ERROR',
);

assert(
  checkPartnerMismatchAllocation({
    allocationId: 'a2',
    settlementVertical: 'ACTIVITY',
    settlementGastroProfileId: null,
    settlementExcursionOperatorId: 'op1',
    validationGastroProfileId: null,
    validationExcursionOperatorId: 'op2',
  }) !== null,
  'activity partner mismatch',
);

console.log('\nAll benefit settlement reporting checks passed.');
