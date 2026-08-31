/**
 * Activity coupon scanner dispatch (no DB).
 * Integration vs PostgreSQL: NO EJECUTADO — use test:gastro-discount-scan pattern when DB is available.
 * Run: pnpm --filter api run test:activity-coupon-scan
 */

import {
  buildActivityCouponQrPayload,
  buildGastroDiscountQrPayload,
  classifyQrScanPayload,
  isManualShortCodeInput,
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
const token = 'd'.repeat(32);
const activity = buildActivityCouponQrPayload(couponId, token);
const gastro = buildGastroDiscountQrPayload('cltestdiscount0001', 'a'.repeat(32));

assert(classifyQrScanPayload(activity) === 'activity-coupon', 'camera activity family');
assert(classifyQrScanPayload(gastro) === 'gastro-discount', 'camera gastro unchanged');
assert(classifyQrScanPayload('yti:v1:' + 'a'.repeat(48)) === 'ticket', 'camera ticket unchanged');
assert(parseActivityCouponQrPayload(gastro) === null, 'gastro payload not parsed as activity');
assert(parseActivityCouponQrPayload(activity)?.couponId === couponId, 'activity parse');
assert(isManualShortCodeInput('K7M-428'), 'manual short code still detected');
assert(!isManualShortCodeInput(activity), 'activity QR is not short code');

console.log('\nActivity coupon scanner dispatch checks passed.');
console.log('NOTE: DB integration (scope, ALREADY_USED, expiry) NO EJECUTADO — PostgreSQL no disponible.');
