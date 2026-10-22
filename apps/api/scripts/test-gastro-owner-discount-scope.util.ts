/**
 * G1.2 — GASTRO_OWNER validate must match authorized GastroProfile (not just same user).
 * Run: pnpm --filter api run test:gastro-owner-discount-scope
 */

import { gastroOwnerDiscountMatchesAuthorizedProfile } from '../src/scanner/gastro-owner-discount-scope.util';
import { validateGastroDiscountBodySchema } from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(
  gastroOwnerDiscountMatchesAuthorizedProfile('local-a', 'local-a') === true,
  'GASTRO_OWNER Local A → descuento A → OK',
);

assert(
  gastroOwnerDiscountMatchesAuthorizedProfile('local-a', 'local-b') === false,
  'GASTRO_OWNER Local A → descuento B → REJECT',
);

assert(
  gastroOwnerDiscountMatchesAuthorizedProfile(null, 'local-a') === false,
  'missing authorized profile → REJECT',
);

assert(
  gastroOwnerDiscountMatchesAuthorizedProfile('local-a', null) === false,
  'discount without gastroProfileId → REJECT',
);

const withProfile = validateGastroDiscountBodySchema.safeParse({
  qrPayload: 'yti:gastro-discount:v1:discount1:token123456789012345678901234',
  profileId: 'local-a',
});
assert(withProfile.success === true, 'validate body accepts optional profileId');

const withoutProfile = validateGastroDiscountBodySchema.safeParse({
  qrPayload: 'short',
});
assert(withoutProfile.success === true, 'validate body still works without profileId');

console.log('\nAll gastro owner discount scope checks passed.');
