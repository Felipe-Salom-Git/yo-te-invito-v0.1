/**
 * Unit checks for activity coupon QR payload v1.
 * Run: pnpm --filter api run test:activity-coupon-qr
 */

import {
  ACTIVITY_COUPON_QR_PREFIX,
  buildActivityCouponQrPayload,
  buildGastroDiscountQrPayload,
  classifyQrScanPayload,
  formatCouponVisualBenefit,
  formatDiscountVisualBenefit,
  isValidActivityCouponQrPayload,
  isValidGastroDiscountQrPayload,
  parseActivityCouponQrPayload,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const couponId = 'cltestcoupon000001';
const token = 'b'.repeat(32);

const v1 = buildActivityCouponQrPayload(couponId, token);
assert(v1 === `${ACTIVITY_COUPON_QR_PREFIX}:${couponId}:${token}`, 'v1 format');
assert(isValidActivityCouponQrPayload(v1), 'v1 valid');

const parsed = parseActivityCouponQrPayload(v1);
assert(parsed?.version === 'v1' && parsed.couponId === couponId && parsed.token === token, 'v1 parse');

assert(!isValidActivityCouponQrPayload('yti:activity-coupon:v1:bad'), 'reject incomplete');
assert(!isValidActivityCouponQrPayload('yti:v1:ticket'), 'reject ticket prefix');

const gastro = buildGastroDiscountQrPayload('cltestdiscount0001', 'a'.repeat(32));
assert(!isValidActivityCouponQrPayload(gastro), 'reject gastro prefix as activity');
assert(isValidGastroDiscountQrPayload(gastro), 'gastro still valid');
assert(classifyQrScanPayload(v1) === 'activity-coupon', 'classify activity');
assert(classifyQrScanPayload(gastro) === 'gastro-discount', 'classify gastro unchanged');
assert(classifyQrScanPayload('yti:v1:' + 'a'.repeat(48)) === 'ticket', 'classify ticket unchanged');

assert(formatCouponVisualBenefit('PERCENT', 15) === '15%', 'percent alias');
assert(formatCouponVisualBenefit('FIXED', 2000) === '$2000', 'fixed alias');
assert(formatCouponVisualBenefit === formatDiscountVisualBenefit, 'alias identity');

console.log('\nAll activity coupon QR checks passed.');
