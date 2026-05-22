/**
 * Unit checks for referral commission calculation (V2).
 * Run: pnpm --filter api run test:referral-commission
 */

import {
  calculateReferralCommissionAmount,
  isExistingCommissionForAttributionOrOrder,
  majorUnitsToCents,
  sumAttributedSubtotalCents,
} from '../src/modules/referrals/referral-commission.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

assert(majorUnitsToCents(10.5) === 1050, 'major to cents');
assert(sumAttributedSubtotalCents([{ subtotalMajor: 100, quantity: 2 }]) === 10000, 'sum subtotal');

const pct = calculateReferralCommissionAmount({
  commissionType: 'PERCENTAGE',
  commissionValue: 10,
  orderItems: [{ subtotalMajor: 1000, quantity: 2 }],
  validTicketCount: 2,
});
assert(pct !== null, 'percentage calc exists');
assert(pct!.attributedSubtotalCents === 100000, 'subtotal 1000 ARS -> 100000 cents');
assert(pct!.amountCents === 10000, '10% of 100000 cents = 10000');

const fixed = calculateReferralCommissionAmount({
  commissionType: 'FIXED_PER_TICKET',
  commissionValue: 500,
  orderItems: [{ subtotalMajor: 200, quantity: 3 }],
  validTicketCount: 3,
});
assert(fixed !== null, 'fixed calc exists');
assert(fixed!.amountCents === 1500, '3 tickets * 500 cents');

const noTickets = calculateReferralCommissionAmount({
  commissionType: 'FIXED_PER_TICKET',
  commissionValue: 500,
  orderItems: [{ subtotalMajor: 200, quantity: 3 }],
  validTicketCount: 0,
});
assert(noTickets === null, 'no valid tickets -> no commission');

const unpaidWouldBe = calculateReferralCommissionAmount({
  commissionType: 'PERCENTAGE',
  commissionValue: 10,
  orderItems: [],
  validTicketCount: 0,
});
assert(unpaidWouldBe === null, 'empty order items / no tickets');

const pctIdempotent = calculateReferralCommissionAmount({
  commissionType: 'PERCENTAGE',
  commissionValue: 10,
  orderItems: [{ subtotalMajor: 500, quantity: 1 }],
  validTicketCount: 1,
});
const pctAgain = calculateReferralCommissionAmount({
  commissionType: 'PERCENTAGE',
  commissionValue: 10,
  orderItems: [{ subtotalMajor: 500, quantity: 1 }],
  validTicketCount: 1,
});
assert(
  pctIdempotent!.amountCents === pctAgain!.amountCents,
  'same inputs same amount (idempotent calc)',
);

assert(
  isExistingCommissionForAttributionOrOrder(
    { referralAttributionId: 'attr-1', orderId: 'ord-1' },
    'attr-1',
    'ord-2',
  ),
  'duplicate by attributionId',
);
assert(
  isExistingCommissionForAttributionOrOrder(
    { referralAttributionId: 'attr-1', orderId: 'ord-1' },
    'attr-9',
    'ord-1',
  ),
  'duplicate by orderId',
);
assert(
  !isExistingCommissionForAttributionOrOrder(null, 'attr-1', 'ord-1'),
  'no existing row',
);

console.log('OK: referral-commission util checks passed');
