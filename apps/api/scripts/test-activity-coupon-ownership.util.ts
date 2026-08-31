/**
 * Ownership helpers for Activity Coupons (no DB).
 * Run: pnpm --filter api run test:activity-coupon-ownership
 */

import {
  activityCouponBelongsToOperator,
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

console.log('\nAll activity coupon ownership checks passed.');
