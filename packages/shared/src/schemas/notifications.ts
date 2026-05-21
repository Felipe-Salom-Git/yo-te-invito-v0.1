import { z } from 'zod';

export const notificationKindSchema = z.enum([
  'TICKET_REMINDER_24H',
  'FAVORITE_EVENT_SOON',
  'EXPECTED_EVENT_SOON',
]);
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
