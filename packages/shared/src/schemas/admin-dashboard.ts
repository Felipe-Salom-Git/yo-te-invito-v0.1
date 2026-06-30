import { z } from 'zod';
import { adminEventStatusSchema } from './admin-producers';

/** Operational KPIs for GET /admin/dashboard */
export const adminDashboardMetricsSchema = z.object({
  pendingEvents: z.number().int().min(0),
  eventsDraftCount: z.number().int().min(0).optional(),
  activeEvents: z.number().int().min(0),
  registeredUsers: z.number().int().min(0),
  activeProducers: z.number().int().min(0),
  pendingDisputes: z.number().int().min(0),
  gastroDiscountsPendingCount: z.number().int().min(0).optional(),
  gastroDiscountClaimsUsedCount: z.number().int().min(0).optional(),
  /** From platform metrics when available (real ticket sales). */
  ticketsSold: z.number().int().min(0).optional(),
  totalReviews: z.number().int().min(0).optional(),
});
export type AdminDashboardMetrics = z.infer<typeof adminDashboardMetricsSchema>;

export const adminDashboardPendingEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: z.string().nullable(),
  status: adminEventStatusSchema,
  city: z.string().nullable(),
  producerName: z.string().nullable(),
  producerProfileId: z.string().nullable(),
  startAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type AdminDashboardPendingEvent = z.infer<typeof adminDashboardPendingEventSchema>;

export const adminDashboardPendingGastroDiscountSchema = z.object({
  id: z.string(),
  title: z.string(),
  profileId: z.string().nullable(),
  profileName: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().datetime(),
});
export type AdminDashboardPendingGastroDiscount = z.infer<
  typeof adminDashboardPendingGastroDiscountSchema
>;

export const adminDashboardResponseSchema = z.object({
  metrics: adminDashboardMetricsSchema,
  pendingEvents: z.array(adminDashboardPendingEventSchema),
  draftEvents: z.array(adminDashboardPendingEventSchema).optional(),
  pendingGastroDiscounts: z.array(adminDashboardPendingGastroDiscountSchema).optional(),
});
export type AdminDashboardResponse = z.infer<typeof adminDashboardResponseSchema>;
