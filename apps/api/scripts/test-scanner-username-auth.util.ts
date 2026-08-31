/**
 * Unit checks for scanner username normalization.
 * Run: pnpm --filter api run test:scanner-username-auth
 */

import {
  normalizeScannerUsername,
  scannerUsernameSchema,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(normalizeScannerUsername('BarraScanner') === 'barrascanner', 'case insensitive');
assert(normalizeScannerUsername('  foo_bar  ') === 'foo_bar', 'trim');

const parsed = scannerUsernameSchema.parse('Puerta-01');
assert(parsed === 'puerta-01', 'schema normalizes');

try {
  scannerUsernameSchema.parse('ab');
  assert(false, 'reject short username');
} catch {
  assert(true, 'reject short username');
}

console.log('\nAll scanner username auth util checks passed.');
