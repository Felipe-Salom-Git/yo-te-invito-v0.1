/**
 * Unit checks for Getnet reconciliation policy.
 * Run: pnpm --filter api run test:getnet-reconciliation
 */

import {
  decideApprovedPaymentAction,
  isOrderExpiredForReconciliation,
} from '../src/modules/public-payments/getnet-reconciliation.policy.util';
import { shouldApplyPaymentStatusUpdate } from '../src/modules/public-payments/providers/getnet/getnet-webhook.util';
import { shouldSendReconciliationAlert } from '../src/modules/public-payments/getnet-reconciliation.metadata.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const now = new Date('2026-06-01T12:00:00Z');
const past = new Date('2026-06-01T11:00:00Z');
const future = new Date('2026-06-01T13:00:00Z');

assert(
  isOrderExpiredForReconciliation({ id: 'o1', status: 'EXPIRED', expiresAt: future }, now),
  'EXPIRED status',
);
assert(
  isOrderExpiredForReconciliation(
    { id: 'o1', status: 'PENDING_PAYMENT', expiresAt: past },
    now,
  ),
  'past expiresAt',
);

const fulfill = decideApprovedPaymentAction({
  order: { id: 'o1', status: 'PENDING_PAYMENT', expiresAt: future },
  payment: { id: 'p1', status: 'PENDING', orderId: 'o1' },
  existingTicketCount: 0,
  expectedTicketCount: 2,
  otherApprovedPaymentIds: [],
  now,
});
assert(fulfill.kind === 'FULFILL', 'vigente → fulfill');

const expired = decideApprovedPaymentAction({
  order: { id: 'o1', status: 'EXPIRED', expiresAt: past },
  payment: { id: 'p1', status: 'PENDING', orderId: 'o1' },
  existingTicketCount: 0,
  expectedTicketCount: 2,
  otherApprovedPaymentIds: [],
  now,
});
assert(
  expired.kind === 'MANUAL_REVIEW' &&
    expired.reason === 'ORDER_EXPIRED_PAYMENT_APPROVED',
  'expired + approved → manual review',
);

const already = decideApprovedPaymentAction({
  order: { id: 'o1', status: 'PAID', expiresAt: future },
  payment: { id: 'p2', status: 'PENDING', orderId: 'o1' },
  existingTicketCount: 2,
  expectedTicketCount: 2,
  otherApprovedPaymentIds: ['p1'],
  now,
});
assert(
  already.kind === 'MANUAL_REVIEW' &&
    already.reason === 'ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT',
  'paid by other payment',
);

const done = decideApprovedPaymentAction({
  order: { id: 'o1', status: 'PAID', expiresAt: future },
  payment: { id: 'p1', status: 'APPROVED', orderId: 'o1' },
  existingTicketCount: 2,
  expectedTicketCount: 2,
  otherApprovedPaymentIds: [],
  now,
});
assert(done.kind === 'ALREADY_FULFILLED', 'tickets complete');

assert(!shouldApplyPaymentStatusUpdate('APPROVED', 'REJECTED'), 'no degrade payment');

assert(
  shouldSendReconciliationAlert(
    { reconciliationAlertSentAt: '2026-01-01', reconciliationAlertReason: 'X' },
    'X',
  ) === false,
  'alert dedup',
);
assert(
  shouldSendReconciliationAlert({}, 'X'),
  'alert first time',
);

console.log('OK: getnet-reconciliation util tests passed');
