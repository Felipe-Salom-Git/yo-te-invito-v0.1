/**
 * Unit checks for Getnet webhook helpers.
 * Run: pnpm --filter api run test:getnet-webhook
 */

import { getnetWebhookBodySchema } from '@yo-te-invito/shared';
import {
  appendWebCheckoutWebhookMetadata,
  buildWebhookIdempotencyKey,
  isDuplicateWebhookEvent,
  mapGetnetWebhookStatusToLocal,
  normalizeGetnetWebhookStatus,
  shouldApplyPaymentStatusUpdate,
  verifyWebhookSecret,
  verifyWebhookBasicAuth,
  appendWebhookEventMetadata,
  extractGetnetExternalPaymentId,
  extractGetnetPaymentLookupKeys,
  extractGetnetRemoteStatus,
  extractGetnetWebCheckoutWebhookInfo,
  hashWebhookPayload,
} from '../src/modules/public-payments/providers/getnet/getnet-webhook.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const approved = mapGetnetWebhookStatusToLocal('APPROVED');
assert(approved.kind === 'mapped' && approved.localStatus === 'APPROVED', 'APPROVED maps');

const authorized = mapGetnetWebhookStatusToLocal('AUTHORIZED');
assert(
  authorized.kind === 'mapped' && authorized.localStatus === 'APPROVED',
  'AUTHORIZED maps to APPROVED',
);

const denied = mapGetnetWebhookStatusToLocal('DENIED');
assert(
  denied.kind === 'mapped' && denied.localStatus === 'REJECTED',
  'DENIED maps to REJECTED',
);

const pending = mapGetnetWebhookStatusToLocal('PENDING');
assert(pending.kind === 'mapped' && pending.localStatus === 'PENDING', 'PENDING maps');

const rejected = mapGetnetWebhookStatusToLocal('REJECTED');
assert(rejected.kind === 'mapped' && rejected.localStatus === 'REJECTED', 'REJECTED maps');

const refunded = mapGetnetWebhookStatusToLocal('REFUNDED');
assert(refunded.kind === 'ignored', 'REFUNDED ignored');

const unknown = mapGetnetWebhookStatusToLocal('NOT_A_REAL_STATUS');
assert(unknown.kind === 'unknown', 'unknown status');

assert(!shouldApplyPaymentStatusUpdate('APPROVED', 'REJECTED'), 'no downgrade APPROVED');
assert(shouldApplyPaymentStatusUpdate('PENDING', 'APPROVED'), 'PENDING to APPROVED');

assert(verifyWebhookSecret('secret', 'secret'), 'secret match');
assert(!verifyWebhookSecret('wrong', 'secret'), 'secret mismatch');

const basicToken = Buffer.from('user:pass').toString('base64');
assert(
  verifyWebhookBasicAuth(`Basic ${basicToken}`, 'user', 'pass'),
  'basic auth match',
);
assert(
  !verifyWebhookBasicAuth(`Basic ${basicToken}`, 'user', 'wrong'),
  'basic auth mismatch',
);

const key1 = buildWebhookIdempotencyKey({
  eventId: 'evt_1',
  externalPaymentId: 'ext',
  remoteStatus: 'APPROVED',
  payloadHash: hashWebhookPayload({ a: 1 }),
});
assert(key1 === 'evt:evt_1', 'idempotency uses eventId');

const meta = appendWebhookEventMetadata(
  {},
  {
    receivedAt: new Date().toISOString(),
    eventId: 'evt_1',
    externalPaymentId: 'ext',
    remoteStatus: 'APPROVED',
    source: 'GETNET_WEBHOOK',
    processedOutcome: 'fulfill:fulfilled',
    payloadHash: 'abc',
    idempotencyKey: key1,
  },
  key1,
);
assert(isDuplicateWebhookEvent(meta, key1), 'duplicate detected');

assert(
  extractGetnetExternalPaymentId({
    status: 'APPROVED',
    uuid: 'uuid-123',
  }) === 'uuid-123',
  'extract uuid legacy',
);

assert(
  extractGetnetExternalPaymentId({
    payment_intent_id: 'pi_abc',
    payment: { result: { status: 'Authorized', payment_id: 'pay-xyz' } },
  }) === 'pi_abc',
  'extract payment_intent_id over result payment_id',
);

const webCheckoutAuthorized = {
  payment_intent_id: 'uuid-intent',
  checkout_id: 'checkout-1',
  order_id: 'order-id',
  payment: {
    amount: 50000,
    currency: 'ARS',
    method: 'credit',
    result: {
      payment_id: 'payment-id',
      status: 'Authorized',
      authorization_code: '999999',
    },
  },
};

const parsedAuthorized = getnetWebhookBodySchema.safeParse(webCheckoutAuthorized);
assert(parsedAuthorized.success, 'Web Checkout Authorized schema parses');

assert(
  normalizeGetnetWebhookStatus(webCheckoutAuthorized) === 'AUTHORIZED',
  'normalize Authorized from payment.result.status',
);
assert(
  extractGetnetRemoteStatus(parsedAuthorized.data!) === 'AUTHORIZED',
  'extractGetnetRemoteStatus Web Checkout',
);

const keys = extractGetnetPaymentLookupKeys(parsedAuthorized.data!);
assert(keys.paymentIntentId === 'uuid-intent', 'lookup paymentIntentId');
assert(keys.orderId === 'order-id', 'lookup orderId');
assert(keys.resultPaymentId === 'payment-id', 'lookup result payment_id');

const info = extractGetnetWebCheckoutWebhookInfo(parsedAuthorized.data!);
assert(info.authorizationCode === '999999', 'authorization code');
assert(info.paymentMethod === 'credit', 'payment method');

const wcMeta = appendWebCheckoutWebhookMetadata({}, {
  info,
  remoteStatus: 'AUTHORIZED',
  processedOutcome: 'reconcile:APPROVED',
});
assert(
  wcMeta.lastWebCheckoutWebhook?.webCheckoutStatusRaw === 'Authorized',
  'webCheckout metadata stored',
);

const webCheckoutDenied = {
  payment_intent_id: 'uuid-intent-2',
  order_id: 'order-2',
  payment: {
    result: { payment_id: 'pay-denied', status: 'Denied', return_message: 'Declined' },
  },
};

const parsedDenied = getnetWebhookBodySchema.safeParse(webCheckoutDenied);
assert(parsedDenied.success, 'Web Checkout Denied schema parses');
const deniedStatus = mapGetnetWebhookStatusToLocal(
  extractGetnetRemoteStatus(parsedDenied.data!),
);
assert(
  deniedStatus.kind === 'mapped' && deniedStatus.localStatus === 'REJECTED',
  'Denied webhook maps to REJECTED',
);

const missingStatus = getnetWebhookBodySchema.safeParse({
  payment_intent_id: 'pi-only',
  order_id: 'ord',
});
assert(!missingStatus.success, 'rejects payload without status');

console.log('OK: getnet-webhook util tests passed');
