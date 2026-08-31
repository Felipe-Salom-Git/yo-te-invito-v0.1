/**
 * Gastro lifecycle notifications: keys, membership filter, nullable email, kinds.
 * Run: pnpm --filter api run test:gastro-lifecycle-notifications
 */

import { NotificationKind } from '@prisma/client';
import {
  gastroDiscountNotificationReferenceKey,
  gastroProfileNotificationReferenceKey,
  notificationKindForDiscountEvent,
  notificationKindForProfileEvent,
  shouldSendGastroLifecycleEmail,
  uniqueActiveMembershipUserIds,
} from '../src/modules/notifications/gastro-lifecycle-notification-keys';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(
  gastroDiscountNotificationReferenceKey('pending', 'd1', 'create') ===
    'gastro-discount-pending:d1:create',
  'pending create key',
);
assert(
  gastroDiscountNotificationReferenceKey('pending', 'd1', 'edit') ===
    'gastro-discount-pending:d1:edit',
  'pending edit key is distinct from create',
);
assert(
  gastroDiscountNotificationReferenceKey('approved', 'd1', 'create') !==
    gastroDiscountNotificationReferenceKey('approved', 'd1', 'edit'),
  'approve create vs edit are distinct (dedupe per event)',
);
assert(
  gastroDiscountNotificationReferenceKey('expired', 'd1') === 'gastro-discount-expired:d1',
  'expired key has no aspect (once per discount)',
);
assert(
  gastroDiscountNotificationReferenceKey('expired', 'd1', 'edit') ===
    gastroDiscountNotificationReferenceKey('expired', 'd1', 'create'),
  'expired ignores aspect — cron ticks cannot duplicate by aspect',
);
assert(
  gastroProfileNotificationReferenceKey('approved', 'p1') === 'gastro-profile-approved:p1',
  'profile approved key',
);
assert(
  gastroProfileNotificationReferenceKey('rejected', 'p1') === 'gastro-profile-rejected:p1',
  'profile rejected key',
);

assert(
  notificationKindForDiscountEvent('pending') ===
    NotificationKind.GASTRO_DISCOUNT_PENDING_REVIEW,
  'pending kind',
);
assert(
  notificationKindForDiscountEvent('approved') ===
    NotificationKind.GASTRO_DISCOUNT_APPROVED_BY_ADMIN,
  'approved kind reused for create and edit',
);
assert(
  notificationKindForDiscountEvent('rejected') ===
    NotificationKind.GASTRO_DISCOUNT_REJECTED_BY_ADMIN,
  'rejected kind',
);
assert(
  notificationKindForDiscountEvent('expired') === NotificationKind.GASTRO_DISCOUNT_EXPIRED,
  'expired kind',
);
assert(
  notificationKindForProfileEvent('approved') ===
    NotificationKind.GASTRO_PROFILE_APPROVED_BY_ADMIN,
  'profile approved kind',
);
assert(
  notificationKindForProfileEvent('rejected') ===
    NotificationKind.GASTRO_PROFILE_REJECTED_BY_ADMIN,
  'profile rejected kind',
);

const memberships = [
  { userId: 'owner-a', profileId: 'local-a', status: 'ACTIVE' },
  { userId: 'owner-a', profileId: 'local-b', status: 'ACTIVE' },
  { userId: 'owner-b', profileId: 'local-b', status: 'ACTIVE' },
  { userId: 'inactive', profileId: 'local-a', status: 'INACTIVE' },
  { userId: 'owner-a', profileId: 'local-a', status: 'ACTIVE' },
];

const localA = uniqueActiveMembershipUserIds(memberships, 'local-a');
const localB = uniqueActiveMembershipUserIds(memberships, 'local-b');

assert(localA.length === 1 && localA[0] === 'owner-a', 'Local A recipients: only owner-a');
assert(
  localB.length === 2 && localB.includes('owner-a') && localB.includes('owner-b'),
  'Local B recipients: both members of B',
);
assert(!localA.includes('owner-b'), 'Local B-only member is not notified for Local A');
assert(!localA.includes('inactive'), 'inactive membership excluded');

assert(
  !shouldSendGastroLifecycleEmail(null, true),
  'null email skips EMAIL even if prefs allow',
);
assert(!shouldSendGastroLifecycleEmail('   ', true), 'whitespace email skips EMAIL');
assert(
  !shouldSendGastroLifecycleEmail('gastro@example.com', false),
  'email present but prefs off → skip EMAIL',
);
assert(
  shouldSendGastroLifecycleEmail('gastro@example.com', true),
  'real email + prefs on → send EMAIL',
);

console.log('\nAll gastro lifecycle notification checks passed.');
