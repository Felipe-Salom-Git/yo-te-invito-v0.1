/**
 * Unit checks for scanner manual short code normalization and ticket lookup.
 * Run: pnpm --filter api run test:scanner-manual-short-code
 */

import {
  classifyQrScanPayload,
  isManualShortCodeInput,
  normalizeManualShortCode,
  resolveTicketQrPayloadByShortCode,
  shortTicketCode,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(normalizeManualShortCode('k7m-428') === 'K7M428', 'normalize hyphen');
assert(normalizeManualShortCode('  ab cd  ') === 'ABCD', 'normalize spaces');
assert(isManualShortCodeInput('K7M428'), 'detect short code');
assert(!isManualShortCodeInput('yti:v1:abc'), 'reject ticket QR');
assert(
  !isManualShortCodeInput('yti:gastro-discount:v1:cltest:aaaa'),
  'reject gastro QR',
);

const ticketId = 'clticket00000000abcd1234';
const code = shortTicketCode(ticketId);
assert(code.length === 8, 'ticket code length');
const qr = 'yti:v1:full-secure-payload-here';
const resolved = resolveTicketQrPayloadByShortCode(code, [
  { id: ticketId, qrPayload: qr },
  { id: 'clother0000000000zzzz9999', qrPayload: 'other' },
]);
assert(resolved === qr, 'resolve unique match');
assert(
  resolveTicketQrPayloadByShortCode(code, []) === null,
  'reject no match',
);

assert(classifyQrScanPayload('K7M428') === 'unknown', 'short code not classified as QR');

console.log('\nAll scanner manual short code checks passed.');
