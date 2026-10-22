/**
 * G1.1 — Admin gastro discount must match route profileId (intra-tenant isolation).
 * Run: pnpm --filter api run test:admin-gastro-discount-profile-scope
 */

import { adminDiscountMatchesRouteProfile } from '../src/modules/admin/admin-gastro-discount-scope.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(
  adminDiscountMatchesRouteProfile('profile-a', 'profile-a') === true,
  'same profile → OK',
);

assert(
  adminDiscountMatchesRouteProfile('profile-a', 'profile-b') === false,
  'cross profile (same tenant conceptual) → REJECT',
);

assert(
  adminDiscountMatchesRouteProfile('  profile-a  ', 'profile-a') === true,
  'trims route profile id',
);

assert(
  adminDiscountMatchesRouteProfile('profile-a', null) === false,
  'missing canonical profile → REJECT',
);

assert(
  adminDiscountMatchesRouteProfile('', 'profile-a') === false,
  'empty route profile → REJECT',
);

assert(
  adminDiscountMatchesRouteProfile(undefined, 'profile-a') === false,
  'undefined route profile → REJECT',
);

assert(
  adminDiscountMatchesRouteProfile('profile-a', 'profile-other-tenant') === false,
  'wrong identity (tenant mismatch simulated by id) → REJECT',
);

assert(
  adminDiscountMatchesRouteProfile('missing-discount-profile', 'profile-a') === false,
  'route profile that does not own discount → REJECT',
);

console.log('\nAll admin gastro discount profile-scope checks passed.');
