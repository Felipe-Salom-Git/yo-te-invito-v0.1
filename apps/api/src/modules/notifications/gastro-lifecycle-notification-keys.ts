import { NotificationKind } from '@prisma/client';

export type GastroDiscountNotifyAspect = 'create' | 'edit';

export function uniqueActiveMembershipUserIds(
  memberships: Array<{ userId: string; profileId: string; status: string }>,
  targetProfileId: string,
): string[] {
  return [
    ...new Set(
      memberships
        .filter((m) => m.profileId === targetProfileId && m.status === 'ACTIVE')
        .map((m) => m.userId),
    ),
  ];
}

/** EMAIL only if the user has a real address. Never fabricate. */
export function shouldSendGastroLifecycleEmail(
  email: string | null | undefined,
  emailNotificationsEnabled: boolean,
): boolean {
  return Boolean(email?.trim()) && emailNotificationsEnabled;
}

export function gastroDiscountNotificationReferenceKey(
  event: 'pending' | 'approved' | 'rejected' | 'expired',
  discountId: string,
  aspect: GastroDiscountNotifyAspect = 'create',
): string {
  if (event === 'expired') return `gastro-discount-expired:${discountId}`;
  return `gastro-discount-${event}:${discountId}:${aspect}`;
}

export function gastroProfileNotificationReferenceKey(
  status: 'approved' | 'rejected',
  profileId: string,
): string {
  return `gastro-profile-${status}:${profileId}`;
}

export function notificationKindForDiscountEvent(
  event: 'pending' | 'approved' | 'rejected' | 'expired',
): NotificationKind {
  if (event === 'pending') return NotificationKind.GASTRO_DISCOUNT_PENDING_REVIEW;
  if (event === 'approved') return NotificationKind.GASTRO_DISCOUNT_APPROVED_BY_ADMIN;
  if (event === 'rejected') return NotificationKind.GASTRO_DISCOUNT_REJECTED_BY_ADMIN;
  return NotificationKind.GASTRO_DISCOUNT_EXPIRED;
}

export function notificationKindForProfileEvent(
  status: 'approved' | 'rejected',
): NotificationKind {
  return status === 'approved'
    ? NotificationKind.GASTRO_PROFILE_APPROVED_BY_ADMIN
    : NotificationKind.GASTRO_PROFILE_REJECTED_BY_ADMIN;
}
