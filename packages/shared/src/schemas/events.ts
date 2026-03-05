import { z } from 'zod';

export const EventMediaType = { IMAGE: 'IMAGE', VIDEO: 'VIDEO' } as const;
export type EventMediaType = (typeof EventMediaType)[keyof typeof EventMediaType];

/**
 * Query params for paginated events list
 * tenantId required (multi-tenant)
 */
export const eventsListQuerySchema = z
  .object({
    tenantId: z.string().min(1, 'tenantId is required'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    city: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (!data.dateFrom || !data.dateTo) return true;
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    },
    { message: 'dateFrom must not be greater than dateTo', path: ['dateFrom'] },
  );

export type EventsListQuery = z.infer<typeof eventsListQuerySchema>;

export const eventDetailQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});

export type EventDetailQuery = z.infer<typeof eventDetailQuerySchema>;

export const eventMediaSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(EventMediaType),
  url: z.string(),
  sortOrder: z.number(),
});

export type EventMedia = z.infer<typeof eventMediaSchema>;

export const eventSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string().datetime(),
  city: z.string().nullable(),
  venueName: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
});

export type EventSummary = z.infer<typeof eventSummarySchema>;

export const eventDetailSchema = eventSummarySchema.extend({
  description: z.string().nullable(),
  endAt: z.string().datetime().nullable(),
  venueAddress: z.string().nullable(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  capacityTotal: z.number().nullable(),
  isTicketingEnabled: z.boolean(),
  status: z.string(),
  media: z.array(eventMediaSchema),
});

export type EventDetail = z.infer<typeof eventDetailSchema>;

export const eventsPaginatedResponseSchema = z.object({
  data: z.array(eventSummarySchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type EventsPaginatedResponse = z.infer<typeof eventsPaginatedResponseSchema>;
