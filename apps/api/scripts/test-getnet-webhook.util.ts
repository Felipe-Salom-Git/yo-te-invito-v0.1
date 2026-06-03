/**
 * Unit checks for Getnet webhook helpers.
 * Run: pnpm --filter api run test:getnet-webhook
 */

import {
  buildWebhookIdempotencyKey,
  isDuplicateWebhookEvent,
  mapGetnetWebhookStatusToLocal,
  shouldApplyPaymentStatusUpdate,
  verifyWebhookSecret,
  verifyWebhookBasicAuth,
  appendWebhookEventMetadata,
  extractGetnetExternalPaymentId,
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
  'extract uuid',
);

assert(
  extractGetnetExternalPaymentId({
    status: 'APPROVED',
    payment_intent_id: 'pi_abc',
  }) === 'pi_abc',
  'extract payment_intent_id',
);

console.log('OK: getnet-webhook util tests passed');
