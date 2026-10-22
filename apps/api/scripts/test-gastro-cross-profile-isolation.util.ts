/**
 * G1.4 — Cross-profile isolation suite (Admin / GASTRO_OWNER / SCANNER / tenant).
 * Same User ≠ same GastroProfile.
 *
 * Run: pnpm --filter api run test:gastro-cross-profile-isolation
 */

import { adminDiscountMatchesRouteProfile } from '../src/modules/admin/admin-gastro-discount-scope.util';
import { gastroOwnerDiscountMatchesAuthorizedProfile } from '../src/scanner/gastro-owner-discount-scope.util';
import { scannerGastroDiscountMatchesParentProfile } from '../src/modules/scanner-accounts/scanner-gastro-discount-scope.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const PROFILE_A = 'gastro-profile-a';
const PROFILE_B = 'gastro-profile-b';
const TENANT_A_PROFILE = 'tenant-a-profile';
const TENANT_B_PROFILE = 'tenant-b-profile';

console.log('\n=== Admin nested discount route ===\n');
assert(
  adminDiscountMatchesRouteProfile(PROFILE_A, PROFILE_A) === true,
  'Admin profile A + discount A → OK',
);
assert(
  adminDiscountMatchesRouteProfile(PROFILE_A, PROFILE_B) === false,
  'Admin profile A + discount B → REJECT',
);
assert(
  adminDiscountMatchesRouteProfile(TENANT_A_PROFILE, TENANT_B_PROFILE) === false,
  'Admin tenant A resource vs tenant B id → REJECT',
);

console.log('\n=== GASTRO_OWNER validate ===\n');
assert(
  gastroOwnerDiscountMatchesAuthorizedProfile(PROFILE_A, PROFILE_A) === true,
  'GASTRO_OWNER Local A → descuento A → OK',
);
assert(
  gastroOwnerDiscountMatchesAuthorizedProfile(PROFILE_A, PROFILE_B) === false,
  'GASTRO_OWNER Local A → descuento B → REJECT (same user, different local)',
);

console.log('\n=== SCANNER parent profile ===\n');
assert(
  scannerGastroDiscountMatchesParentProfile(PROFILE_A, PROFILE_A) === true,
  'Scanner A + discount A → OK',
);
assert(
  scannerGastroDiscountMatchesParentProfile(PROFILE_A, PROFILE_B) === false,
  'Scanner A + discount B → REJECT',
);
assert(
  scannerGastroDiscountMatchesParentProfile(PROFILE_A, null) === false,
  'Scanner A + discount without gastroProfileId → REJECT',
);

console.log('\n=== Same user does not imply same profile ===\n');
const sameUserOwns = [PROFILE_A, PROFILE_B];
assert(sameUserOwns.includes(PROFILE_A) && sameUserOwns.includes(PROFILE_B), 'fixture: user owns A and B');
assert(
  gastroOwnerDiscountMatchesAuthorizedProfile(PROFILE_A, PROFILE_B) === false,
  'membership in A and B does not authorize validating B under context A',
);
assert(
  scannerGastroDiscountMatchesParentProfile(PROFILE_A, PROFILE_B) === false,
  'scanner bound to A cannot validate B even if parent user owns B',
);

console.log('\nAll gastro cross-profile isolation checks passed.\n');
