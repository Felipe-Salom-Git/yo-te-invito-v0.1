/**
 * Ownership helpers for Activity Coupons (no DB).
 * Run: pnpm --filter api run test:activity-coupon-ownership
 */

import {
  activityCouponBelongsToOperator,
  canScannerAccessActivityCoupon,
  isEventCategoryEligibleForActivityCoupon,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const operatorA = 'op-a';
const operatorB = 'op-b';

assert(activityCouponBelongsToOperator(operatorA, operatorA), 'same operator');
assert(!activityCouponBelongsToOperator(operatorA, operatorB), 'cross-operator rejected');
assert(!activityCouponBelongsToOperator(null, operatorA), 'null event operator rejected');
assert(!activityCouponBelongsToOperator(undefined, operatorA), 'undefined event operator rejected');
assert(
  isEventCategoryEligibleForActivityCoupon('excursion') &&
    activityCouponBelongsToOperator(operatorA, operatorA),
  'excursion + operator match',
);
assert(
  !(
    isEventCategoryEligibleForActivityCoupon('gastro') &&
    activityCouponBelongsToOperator(operatorA, operatorA)
  ),
  'gastro category cannot own activity coupon even with operator match',
);

const baseScan = {
  scannerParentType: 'EXCURSION_OPERATOR',
  scannerParentProfileId: operatorA,
  scannerTenantId: 'tenant-a',
  couponTenantId: 'tenant-a',
  couponExcursionOperatorId: operatorA,
  eventCategory: 'excursion',
};

assert(canScannerAccessActivityCoupon(baseScan), 'scanner same operator + excursion allowed');
assert(
  !canScannerAccessActivityCoupon({ ...baseScan, scannerParentProfileId: operatorB }),
  'scanner other operator rejected',
);
assert(
  !canScannerAccessActivityCoupon({ ...baseScan, scannerParentType: 'GASTRO' }),
  'scanner GASTRO parent rejected',
);
assert(
  !canScannerAccessActivityCoupon({ ...baseScan, scannerParentType: 'PRODUCER' }),
  'scanner PRODUCER parent rejected',
);
assert(
  !canScannerAccessActivityCoupon({ ...baseScan, eventCategory: 'event' }),
  'event category rejected',
);
assert(
  !canScannerAccessActivityCoupon({ ...baseScan, eventCategory: 'gastro' }),
  'gastro event rejected at scanner',
);
assert(
  !canScannerAccessActivityCoupon({ ...baseScan, eventCategory: 'rental' }),
  'rental event rejected at scanner',
);
assert(
  !canScannerAccessActivityCoupon({ ...baseScan, eventCategory: 'hotel' }),
  'hotel event rejected at scanner',
);
assert(
  !canScannerAccessActivityCoupon({ ...baseScan, couponTenantId: 'tenant-b' }),
  'other tenant rejected',
);

console.log('\nAll activity coupon ownership checks passed.');
