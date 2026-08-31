/**
 * Archive / lifecycle bucket helpers.
 * Run: pnpm --filter api run test:gastro-discount-archive
 */

import {
  canArchiveGastroDiscount,
  canUnarchiveGastroDiscount,
  classifyGastroDiscountLifecycle,
  isGastroDiscountDateExpired,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const now = new Date('2026-10-01T12:00:00-03:00');

assert(
  !canArchiveGastroDiscount({ status: 'ACTIVE', validTo: '2026-10-15', now }),
  'cannot archive a currently active date-range discount',
);
assert(
  canArchiveGastroDiscount({
    status: 'ACTIVE',
    validTo: '2026-09-01T02:59:59.999Z',
    now,
  }),
  'can archive ACTIVE that is date-expired',
);
assert(
  canArchiveGastroDiscount({ status: 'EXPIRED' }),
  'can archive EXPIRED',
);
assert(
  canArchiveGastroDiscount({ status: 'CANCELLED' }),
  'can archive CANCELLED',
);
assert(
  canArchiveGastroDiscount({ status: 'REJECTED' }),
  'can archive REJECTED',
);
assert(
  !canArchiveGastroDiscount({ status: 'PENDING_REVIEW' }),
  'cannot archive PENDING_REVIEW',
);
assert(
  !canArchiveGastroDiscount({ status: 'EXPIRED', archivedAt: new Date() }),
  'cannot archive twice',
);
assert(
  canUnarchiveGastroDiscount({ status: 'EXPIRED', archivedAt: new Date() }),
  'can unarchive',
);

assert(
  !isGastroDiscountDateExpired({
    status: 'ACTIVE',
    validityMode: 'WEEKLY_RECURRING',
    validWeekday: 'FRIDAY',
    now,
  }),
  'weekly without validTo does not expire',
);

assert(
  classifyGastroDiscountLifecycle({ status: 'ACTIVE', now }) === 'ACTIVE',
  'live ACTIVE bucket',
);
assert(
  classifyGastroDiscountLifecycle({
    status: 'ACTIVE',
    hasPendingUpdate: true,
  }) === 'PENDING',
  'pending edit is PENDING bucket',
);
assert(
  classifyGastroDiscountLifecycle({ status: 'EXPIRED' }) === 'FINISHED',
  'EXPIRED is FINISHED',
);
assert(
  classifyGastroDiscountLifecycle({
    status: 'EXPIRED',
    archivedAt: new Date(),
  }) === 'ARCHIVED',
  'archived wins over status',
);

console.log('\nAll gastro discount archive util checks passed.');
