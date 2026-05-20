import { z } from 'zod';
import { producerEventMetricsResponseSchema } from './events';

export const adminProfileStatusSchema = z.enum([
  'draft',
  'pending',
  'active',
  'rejected',
  'suspended',
]);
export type AdminProfileStatus = z.infer<typeof adminProfileStatusSchema>;

export const adminEventStatusSchema = z.enum([
  'draft',
  'pending',
  'approved',
  'paused',
  'cancelled',
]);
export type AdminEventStatus = z.infer<typeof adminEventStatusSchema>;

export const adminProducersListQuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: adminProfileStatusSchema.optional(),
  hasPendingEvents: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type AdminProducersListQuery = z.infer<typeof adminProducersListQuerySchema>;

export const adminProducerIdParamsSchema = z.object({
  producerId: z.string().min(1),
});
export type AdminProducerIdParams = z.infer<typeof adminProducerIdParamsSchema>;

export const adminProducerEventIdParamsSchema = adminProducerIdParamsSchema.extend({
  eventId: z.string().min(1),
});
export type AdminProducerEventIdParams = z.infer<typeof adminProducerEventIdParamsSchema>;

export const adminProducerOwnerSchema = z.object({
  userId: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});
export type AdminProducerOwner = z.infer<typeof adminProducerOwnerSchema>;

export const adminProducerListItemSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  status: adminProfileStatusSchema,
  primaryEmail: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  city: z.string().nullable(),
  owner: adminProducerOwnerSchema,
  eventsCount: z.number().int().min(0),
  pendingEventsCount: z.number().int().min(0),
  approvedEventsCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
});
export type AdminProducerListItem = z.infer<typeof adminProducerListItemSchema>;

export const adminProducersListResponseSchema = z.object({
  data: z.array(adminProducerListItemSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type AdminProducersListResponse = z.infer<typeof adminProducersListResponseSchema>;

export const adminProducerDetailSchema = adminProducerListItemSchema.extend({
  legalName: z.string().nullable(),
  shortDescription: z.string().nullable(),
  longDescription: z.string().nullable(),
  whatsapp: z.string().nullable(),
  secondaryEmail: z.string().nullable(),
  secondaryPhone: z.string().nullable(),
  slug: z.string().nullable(),
  updatedAt: z.string().datetime(),
});
export type AdminProducerDetail = z.infer<typeof adminProducerDetailSchema>;

export const adminProducerEventListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable(),
  city: z.string().nullable(),
  venueName: z.string().nullable(),
  status: adminEventStatusSchema,
  category: z.string().nullable(),
  hasTicketing: z.boolean(),
  isTicketingEnabled: z.boolean(),
  isGeneralPublication: z.boolean().optional(),
  eventMode: z.enum(['PUBLICITY_ONLY', 'TICKETED']).optional(),
  ticketTypesCount: z.number().int().min(0),
  activeTicketTypesCount: z.number().int().min(0),
  ticketsSold: z.number().int().min(0).optional(),
  revenue: z.string().optional(),
  ratingAvg: z.number().nullable().optional(),
  ratingCount: z.number().int().min(0).optional(),
});
export type AdminProducerEventListItem = z.infer<typeof adminProducerEventListItemSchema>;

export const adminProducerEventsResponseSchema = z.object({
  data: z.array(adminProducerEventListItemSchema),
});
export type AdminProducerEventsResponse = z.infer<typeof adminProducerEventsResponseSchema>;

export const eventModerationReasonSchema = z.object({
  reason: z.string().min(1, 'El motivo es obligatorio').max(2000),
  newStartAt: z.string().datetime().optional(),
});
export type EventModerationReason = z.infer<typeof eventModerationReasonSchema>;

export const adminProducerEventMetricsSchema = producerEventMetricsResponseSchema.extend({
  hasTicketing: z.boolean(),
  isGeneralPublication: z.boolean().optional(),
  ticketTypesCount: z.number().int().min(0),
  activeTicketTypesCount: z.number().int().min(0),
  ticketsAvailable: z.number().int().min(0),
  paidOrdersCount: z.number().int().min(0),
  pendingOrdersCount: z.number().int().min(0),
  expiredOrdersCount: z.number().int().min(0),
  attendanceRatePercent: z.number().min(0).max(100).optional(),
  ratingAvg: z.number().nullable().optional(),
  ratingCount: z.number().int().min(0).optional(),
});
export type AdminProducerEventMetrics = z.infer<typeof adminProducerEventMetricsSchema>;

export const adminProducerEventModerationResponseSchema = z.object({
  id: z.string(),
  status: z.string(),
});
export type AdminProducerEventModerationResponse = z.infer<
  typeof adminProducerEventModerationResponseSchema
>;
