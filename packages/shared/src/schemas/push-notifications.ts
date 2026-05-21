import { z } from 'zod';

export const pushSubscriptionKeysSchema = z.object({
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});
export type PushSubscriptionKeys = z.infer<typeof pushSubscriptionKeysSchema>;

export const registerPushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: pushSubscriptionKeysSchema,
  userAgent: z.string().max(500).optional(),
  deviceName: z.string().max(120).optional(),
  platform: z.string().max(80).optional(),
});
export type RegisterPushSubscriptionBody = z.infer<typeof registerPushSubscriptionSchema>;

export const pushSubscriptionSchema = z.object({
  id: z.string(),
  endpoint: z.string(),
  userAgent: z.string().nullable().optional(),
  deviceName: z.string().nullable().optional(),
  platform: z.string().nullable().optional(),
  isActive: z.boolean(),
  lastUsedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;

export const mePushSubscriptionsResponseSchema = z.object({
  subscriptions: z.array(pushSubscriptionSchema),
});
export type MePushSubscriptionsResponse = z.infer<typeof mePushSubscriptionsResponseSchema>;

export const pushSubscriptionsConfigSchema = z.object({
  pushEnabled: z.boolean(),
  vapidPublicKey: z.string().nullable(),
});
export type PushSubscriptionsConfig = z.infer<typeof pushSubscriptionsConfigSchema>;

export const deactivatePushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
});
export type DeactivatePushSubscriptionBody = z.infer<typeof deactivatePushSubscriptionSchema>;

export const sendTestPushSchema = z.object({
  endpoint: z.string().url().optional(),
});
export type SendTestPushBody = z.infer<typeof sendTestPushSchema>;

export const sendTestPushResponseSchema = z.object({
  sent: z.number().int().min(0),
  message: z.string(),
});
export type SendTestPushResponse = z.infer<typeof sendTestPushResponseSchema>;

export const webPushPayloadSchema = z.object({
  title: z.string(),
  body: z.string(),
  url: z.string().optional(),
  icon: z.string().optional(),
  type: z.string().max(64).optional(),
});
export type WebPushPayload = z.infer<typeof webPushPayloadSchema>;
