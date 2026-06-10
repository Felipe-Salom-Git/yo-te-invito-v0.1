import { z } from 'zod';

export const notificationKindSchema = z.enum([
  'TICKET_REMINDER_24H',
  'FAVORITE_EVENT_SOON',
  'EXPECTED_EVENT_SOON',
  'TRANSFER_OFFER_PENDING',
  'TICKET_TRANSFER_ACCEPTED',
  'TICKET_TRANSFER_REJECTED',
  'TICKET_TRANSFER_CANCELLED',
  'REVIEW_PENDING',
  'FOLLOWED_PRODUCER_NEW_EVENT',
  'FOLLOWED_GASTRO_NEW_DISCOUNT',
  'FAVORITE_INTEREST_NEW_CONTENT',
  'EVENT_APPROVED_BY_ADMIN',
  'EVENT_REJECTED_BY_ADMIN',
  'REVIEW_RECEIVED',
  'REVIEW_OFFICIAL_REPLY',
  'REVIEW_DISPUTE_CREATED',
  'REVIEW_DISPUTE_ACCEPTED',
  'REVIEW_DISPUTE_REJECTED',
  'REVIEW_MODERATION_HIDDEN',
  'REVIEW_MODERATION_RESTORED',
  'TICKET_DATE_CHANGE_REQUESTED',
  'TICKET_DATE_CHANGE_PENDING_PRODUCER',
  'TICKET_DATE_CHANGE_APPROVED',
  'TICKET_DATE_CHANGE_REJECTED',
  'TICKET_DATE_CHANGE_APPLIED',
]);

export const PRODUCER_EVENT_STATUS_NOTIFICATION_KINDS = [
  'EVENT_APPROVED_BY_ADMIN',
  'EVENT_REJECTED_BY_ADMIN',
] as const;

/** Reviews V2 — portal gestión + autor de reseña */
export const REVIEW_NOTIFICATION_KINDS = [
  'REVIEW_RECEIVED',
  'REVIEW_OFFICIAL_REPLY',
  'REVIEW_DISPUTE_CREATED',
  'REVIEW_DISPUTE_ACCEPTED',
  'REVIEW_DISPUTE_REJECTED',
  'REVIEW_MODERATION_HIDDEN',
  'REVIEW_MODERATION_RESTORED',
] as const;
export type ReviewNotificationKind = (typeof REVIEW_NOTIFICATION_KINDS)[number];

export const MANAGED_REVIEW_NOTIFICATION_KINDS = [
  'REVIEW_RECEIVED',
  'REVIEW_DISPUTE_CREATED',
  'REVIEW_DISPUTE_ACCEPTED',
  'REVIEW_DISPUTE_REJECTED',
] as const;

export const REVIEW_AUTHOR_NOTIFICATION_KINDS = [
  'REVIEW_OFFICIAL_REPLY',
  'REVIEW_MODERATION_HIDDEN',
  'REVIEW_MODERATION_RESTORED',
] as const;
export type NotificationKind = z.infer<typeof notificationKindSchema>;

export const userNotificationSchema = z.object({
  id: z.string(),
  kind: notificationKindSchema,
  referenceKey: z.string(),
  title: z.string(),
  body: z.string(),
  href: z.string().nullable().optional(),
  readAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type UserNotification = z.infer<typeof userNotificationSchema>;

export const meNotificationsResponseSchema = z.object({
  items: z.array(userNotificationSchema),
  unreadCount: z.number().int(),
});
export type MeNotificationsResponse = z.infer<typeof meNotificationsResponseSchema>;

export const meNotificationsUnreadSchema = z.object({
  unreadCount: z.number().int(),
});
export type MeNotificationsUnread = z.infer<typeof meNotificationsUnreadSchema>;
