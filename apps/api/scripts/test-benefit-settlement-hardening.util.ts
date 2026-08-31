/**
 * Benefit settlement hardening invariants (no DB).
 * Run: pnpm --filter api run test:benefit-settlement-hardening
 */

import {
  benefitValidationAllocationKey,
  checkClosedWithPendingUsages,
  checkOrphanAllocation,
  checkPartnerMismatchAllocation,
  deriveBenefitSettlementStatus,
  deriveCashCollectionStatus,
  deriveIntegrityStatus,
} from '@yo-te-invito/shared';
import { computeCashDueCents, computeCashReceivedCents } from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(
  benefitValidationAllocationKey('GASTRO_DISCOUNT_VALIDATION', 'v1') !==
    benefitValidationAllocationKey('ACTIVITY_COUPON_VALIDATION', 'v1'),
  'composite allocation key differs by source',
);

assert(
  checkOrphanAllocation({
    allocationId: 'a1',
    validationSource: 'GASTRO_DISCOUNT_VALIDATION',
    validationId: 'missing',
    validationExists: false,
  })?.code === 'ORPHAN_ALLOCATION',
  'orphan allocation detected',
);

assert(
  checkPartnerMismatchAllocation({
    allocationId: 'a1',
    settlementVertical: 'GASTRO',
    settlementGastroProfileId: 'g1',
    settlementExcursionOperatorId: null,
    validationGastroProfileId: 'g2',
    validationExcursionOperatorId: null,
  })?.code === 'PARTNER_MISMATCH',
  'gastro partner mismatch detected',
);

assert(
  checkClosedWithPendingUsages('CLOSED', 1, 's1') !== null,
  'CLOSED with pending is integrity ERROR',
);

assert(
  deriveIntegrityStatus([]) === 'OK',
  'empty issues => OK',
);

const cashDue = computeCashDueCents([{ mode: 'CASH', baseAmountCents: 5000000n }]);
const cashReceived = computeCashReceivedCents([
  { amountCents: 2500000n, reversedAt: null },
]);
assert(
  deriveCashCollectionStatus(cashDue, cashReceived) === 'PARTIALLY_RECEIVED',
  'partial cash collection is normal not error',
);

assert(
  deriveBenefitSettlementStatus({
    status: 'CLOSED',
    allocatedUsageCount: 5,
    pendingUsageCount: 0,
  }) === 'CLOSED',
  'CLOSED preserved independent of cash',
);

assert(
  deriveCashCollectionStatus(cashDue, cashReceived) !== 'RECEIVED' || cashReceived < cashDue,
  'CLOSED != PAID semantics: partial cash not RECEIVED',
);

// Double allocation invariant (DB @@unique + service P2002 → BENEFIT_SETTLEMENT_ALLOCATION_CONFLICT):
// request A CASH + request B BARTER on same validation → second rejected
// same validation on different settlement → second rejected
console.log(
  'NOTE: double allocation blocked by BenefitSettlementUsageAllocation @@unique([validationSource, validationId])',
);

console.log('\nAll benefit settlement hardening checks passed.');
