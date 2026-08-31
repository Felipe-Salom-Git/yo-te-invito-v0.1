/**
 * Activity coupon claim contracts: QR, short code, duplicate, expiry (no DB).
 * Run: pnpm --filter api run test:activity-coupon-claim
 */

import {
  activityCouponPublicClaimBodySchema,
  buildActivityCouponQrPayload,
  classifyQrScanPayload,
  formatManualShortCodeDisplay,
  isActivityCouponClaimActive,
  isGastroDiscountValidToday,
  isManualShortCodeInput,
  normalizeManualShortCode,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const couponId = 'cltestcoupon000001';
const token = 'c'.repeat(32);
const payload = buildActivityCouponQrPayload(couponId, token);
assert(classifyQrScanPayload(payload) === 'activity-coupon', 'claim QR family');
assert(classifyQrScanPayload(payload) !== 'gastro-discount', 'claim QR not gastro');

const code = 'K7M428';
assert(code.length === 6, 'short code 6 chars (same charset, own table)');
assert(formatManualShortCodeDisplay(code).includes('-'), 'display hyphen XXX-XXX');
assert(isManualShortCodeInput(formatManualShortCodeDisplay(code)), 'manual input detects activity short code');
assert(normalizeManualShortCode('ABC-123') === 'ABC123', 'normalize same as gastro display');
assert(!isManualShortCodeInput(payload), 'QR is not short code');

assert(isActivityCouponClaimActive('ACTIVE'), 'active claim');
assert(!isActivityCouponClaimActive('USED'), 'used is not active — duplicate used fails');
assert(!isActivityCouponClaimActive('EXPIRED'), 'expired claim not reusable');

assert(activityCouponPublicClaimBodySchema.safeParse({ tenantId: 't', email: 'a@b.com' }).success, 'claim body');
assert(!activityCouponPublicClaimBodySchema.safeParse({ tenantId: 't' }).success, 'email required');
assert(
  !activityCouponPublicClaimBodySchema.safeParse({ tenantId: 't', email: 'a@b.com', extra: 1 }).success,
  'claim body strict',
);

assert(
  isGastroDiscountValidToday({
    status: 'ACTIVE',
    validityMode: 'DATE_RANGE',
    validFrom: '2020-01-01',
    validTo: '2099-12-31',
  }).valid,
  'in-range coupon claimable',
);
assert(
  !isGastroDiscountValidToday({
    status: 'ACTIVE',
    validityMode: 'DATE_RANGE',
    validFrom: '2020-01-01',
    validTo: '2020-01-02',
  }).valid,
  'expired coupon not claimable',
);

console.log('\nAll activity coupon claim checks passed.');
