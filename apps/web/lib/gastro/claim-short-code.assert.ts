/**
 * G11.1 — Web QR surfaces show the claim short code in the same form as the claim email.
 * Run: pnpm --filter api run test:web-qr-short-code
 */
import { formatGastroClaimShortCodeDisplay } from './claim-short-code';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

assert(formatGastroClaimShortCodeDisplay('K7M428') === 'K7M-428', 'stored 6-char code → XXX-XXX');
assert(formatGastroClaimShortCodeDisplay('k7m-428') === 'K7M-428', 'already formatted / lowercase → XXX-XXX');
assert(formatGastroClaimShortCodeDisplay('a1b2c3d4') === 'A1B2C3D4', 'legacy long code → shown as-is (uppercase)');
assert(formatGastroClaimShortCodeDisplay(null) === null, 'no code → nothing rendered');
assert(formatGastroClaimShortCodeDisplay('  ') === null, 'blank code → nothing rendered');

console.log('OK: web qr short code');
