/**
 * Admin vs gastro origin / initial status.
 * Run: pnpm --filter api run test:gastro-discount-origin
 */

import {
  initialStatusForDiscountOrigin,
  isGastroProfileEligibleForAdminDiscountCreate,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(initialStatusForDiscountOrigin('ADMIN') === 'ACTIVE', 'ADMIN creates ACTIVE');
assert(initialStatusForDiscountOrigin('GASTRO') === 'PENDING_REVIEW', 'GASTRO creates PENDING_REVIEW');
assert(isGastroProfileEligibleForAdminDiscountCreate('ACTIVE'), 'ACTIVE profile eligible');
assert(!isGastroProfileEligibleForAdminDiscountCreate('PENDING'), 'PENDING profile rejected');
assert(!isGastroProfileEligibleForAdminDiscountCreate('REJECTED'), 'REJECTED profile rejected');

console.log('\nAll gastro discount origin util checks passed.');
