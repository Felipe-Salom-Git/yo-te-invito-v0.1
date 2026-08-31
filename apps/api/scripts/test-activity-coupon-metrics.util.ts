/**
 * Activity coupon metrics + claim notification helpers (no DB).
 * Run: pnpm --filter api run test:activity-coupon-metrics
 */

import {
  computeActivityCouponMetrics,
  shouldSendActivityCouponClaimEmail,
} from '@yo-te-invito/shared';
import { renderEmailTemplate } from '../src/email/templates/email-template.renderer';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(!shouldSendActivityCouponClaimEmail(null), 'null email → skip EMAIL');
assert(!shouldSendActivityCouponClaimEmail(undefined), 'undefined email → skip EMAIL');
assert(!shouldSendActivityCouponClaimEmail(''), 'blank email → skip EMAIL');
assert(!shouldSendActivityCouponClaimEmail('   '), 'whitespace email → skip EMAIL');
assert(shouldSendActivityCouponClaimEmail('user@example.com'), 'real email → send EMAIL');

const empty = computeActivityCouponMetrics({
  claimsIssued: 0,
  claimsUsed: 0,
  claimsUnused: 0,
  validations: 0,
});
assert(empty.useRate === 0, 'use rate 0 when no claims');

const half = computeActivityCouponMetrics({
  claimsIssued: 10,
  claimsUsed: 3,
  claimsUnused: 7,
  validations: 3,
});
assert(half.claimsIssued === 10, 'issued');
assert(half.claimsUsed === 3, 'used');
assert(half.claimsUnused === 7, 'unused ACTIVE');
assert(half.validations === 3, 'validations');
assert(half.useRate === 30, 'use rate 30%');

const rendered = renderEmailTemplate({
  templateId: 'ACTIVITY_COUPON_QR',
  variables: {
    userName: 'Ana',
    operatorName: 'Operador Sur',
    eventTitle: 'Kayak delta',
    couponTitle: '2x1',
    benefitLabel: '50%',
    shortCode: 'AB3-K9P',
    claimUrl: 'https://example.test/excursiones/cupones/reclamo/x',
    hasAccount: true,
    accountUrl: 'https://example.test/me/descuentos',
  },
});
assert(rendered.subject.toLowerCase().includes('kayak'), 'activity email subject uses event title');
assert(rendered.html.includes('Actividades'), 'activity email copy uses Actividades');
assert(!rendered.html.toLowerCase().includes('local gastron'), 'activity email is not gastro copy');
assert(rendered.html.includes('AB3-K9P'), 'activity email includes short code');
assert(rendered.html.includes('/excursiones/cupones/reclamo/'), 'claim URL stays on /excursiones');

console.log('\nAll activity coupon metrics/notification checks passed.');
