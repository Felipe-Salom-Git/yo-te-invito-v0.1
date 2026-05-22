/**
 * Unit checks for gastro discount QR payload v1.
 * Run: pnpm --filter api run test:gastro-discount-qr
 */

import {
  buildGastroDiscountQrPayload,
  classifyQrScanPayload,
  GASTRO_DISCOUNT_QR_PREFIX,
  isValidGastroDiscountQrPayload,
  parseGastroDiscountQrPayload,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const discountId = 'cltestdiscount0001';
const token = 'a'.repeat(32);

const v1 = buildGastroDiscountQrPayload(discountId, token);
assert(v1 === `${GASTRO_DISCOUNT_QR_PREFIX}:${discountId}:${token}`, 'v1 format');
assert(isValidGastroDiscountQrPayload(v1), 'v1 valid');

const parsed = parseGastroDiscountQrPayload(v1);
assert(parsed?.version === 'v1' && parsed.discountId === discountId && parsed.token === token, 'v1 parse');

const legacy = `yti:gastro-discount|tenant-demo|evt1|${discountId}|${token}`;
const legacyParsed = parseGastroDiscountQrPayload(legacy);
assert(legacyParsed?.version === 'legacy', 'legacy parse');

assert(!isValidGastroDiscountQrPayload('yti:gastro-discount:v1:bad'), 'reject incomplete');
assert(!isValidGastroDiscountQrPayload('yti:v1:ticket'), 'reject ticket prefix');

assert(classifyQrScanPayload(v1) === 'gastro-discount', 'classify gastro');
assert(classifyQrScanPayload('yti:v1:' + 'a'.repeat(48)) === 'ticket', 'classify ticket');

console.log('\nAll gastro discount QR checks passed.');
