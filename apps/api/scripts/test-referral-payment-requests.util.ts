/**
 * Unit checks for referral payment request validation helpers.
 * Run: pnpm --filter api run test:referral-payment-requests
 */

import {
  allCommissionsSameProducer,
  hasOpenRequestCommissionOverlap,
  OPEN_REFERRAL_PAYMENT_REQUEST_STATUSES,
  paymentRequestAuthorizedForProducer,
  validateCommissionPaymentEligibility,
} from '../src/modules/referrals/referral-payment-requests.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

assert(OPEN_REFERRAL_PAYMENT_REQUEST_STATUSES.length === 2, 'open statuses');

assert(
  validateCommissionPaymentEligibility([
    { status: 'CONFIRMED', referralAttributionId: 'a1', producerProfileId: 'p1' },
  ]) === null,
  'confirmed + attribution ok',
);
assert(
  validateCommissionPaymentEligibility([
    { status: 'PENDING', referralAttributionId: 'a1', producerProfileId: 'p1' },
  ]) === 'not_confirmed',
  'pending not eligible',
);
assert(
  validateCommissionPaymentEligibility([
    { status: 'CONFIRMED', referralAttributionId: null, producerProfileId: 'p1' },
  ]) === 'no_attribution',
  'missing attribution',
);

assert(
  allCommissionsSameProducer([
    { producerProfileId: 'p1' },
    { producerProfileId: 'p1' },
  ]),
  'same producer',
);
assert(
  !allCommissionsSameProducer([
    { producerProfileId: 'p1' },
    { producerProfileId: 'p2' },
  ]),
  'different producers',
);

const overlap = hasOpenRequestCommissionOverlap(['c1', 'c2'], ['c2', 'c3']);
assert(overlap.length === 1 && overlap[0] === 'c2', 'overlap detection');
assert(
  hasOpenRequestCommissionOverlap(['c1'], ['c3']).length === 0,
  'no overlap',
);

assert(
  paymentRequestAuthorizedForProducer('prod-a', 'prod-a'),
  'same producer authorized',
);
assert(
  !paymentRequestAuthorizedForProducer('prod-a', 'prod-b'),
  'foreign producer not authorized',
);

console.log('OK: referral-payment-requests util checks passed');
