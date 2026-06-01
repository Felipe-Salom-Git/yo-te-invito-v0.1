/**
 * Unit checks for order fulfillment idempotency helpers.
 * Run: pnpm --filter api run test:order-fulfillment
 */

import {
  expectedTicketCountFromItems,
  isOrderTicketFulfillmentComplete,
  paymentMetadataHasConfirmationEmailSent,
} from '../src/modules/public-payments/order-fulfillment.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

assert(
  expectedTicketCountFromItems([{ quantity: 2 }, { quantity: 3 }]) === 5,
  'expected ticket count sum',
);

assert(
  isOrderTicketFulfillmentComplete(5, 5),
  'complete when equal',
);
assert(
  isOrderTicketFulfillmentComplete(6, 5),
  'complete when over-fulfilled',
);
assert(
  !isOrderTicketFulfillmentComplete(4, 5),
  'not complete when missing tickets',
);

assert(
  !paymentMetadataHasConfirmationEmailSent(null),
  'null metadata not sent',
);
assert(
  !paymentMetadataHasConfirmationEmailSent({}),
  'empty metadata not sent',
);
assert(
  paymentMetadataHasConfirmationEmailSent({ orderConfirmationEmailSent: true }),
  'flag detected',
);

console.log('OK: order-fulfillment util tests passed');
