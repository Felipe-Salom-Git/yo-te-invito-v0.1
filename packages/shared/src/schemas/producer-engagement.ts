import { z } from 'zod';

/** POST /public/events/:eventId/view */
export const publicEventViewParamsSchema = z.object({
  eventId: z.string().min(1),
});
export type PublicEventViewParams = z.infer<typeof publicEventViewParamsSchema>;

export const publicEventViewQuerySchema = z.object({
  tenantId: z.string().min(1),
});
export type PublicEventViewQuery = z.infer<typeof publicEventViewQuerySchema>;

export const publicEventViewResponseSchema = z.object({
  recorded: z.boolean(),
});
export type PublicEventViewResponse = z.infer<typeof publicEventViewResponseSchema>;

/** POST /public/producers/:idOrSlug/view */
export const publicProducerViewParamsSchema = z.object({
  idOrSlug: z.string().min(1),
});
export type PublicProducerViewParams = z.infer<typeof publicProducerViewParamsSchema>;

export const publicProducerViewResponseSchema = z.object({
  recorded: z.boolean(),
});
export type PublicProducerViewResponse = z.infer<typeof publicProducerViewResponseSchema>;

/** GET /producer/dashboard/metrics */
export const producerDashboardEventEngagementSchema = z.object({
  id: z.string(),
  viewCount: z.number().int().min(0),
  favoriteCount: z.number().int().min(0),
  expectedCount: z.number().int().min(0),
});

export const producerDashboardTopEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string().datetime().nullable(),
  status: z.string(),
  viewCount: z.number().int().min(0),
  favoriteCount: z.number().int().min(0),
  expectedCount: z.number().int().min(0),
  interestRate: z.number().nullable(),
});

export const producerDashboardMetricsResponseSchema = z.object({
  events: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    upcoming: z.number().int().min(0),
    past: z.number().int().min(0),
  }),
  sales: z.object({
    ticketsSold: z.number().int().min(0),
    revenue: z.string().nullable(),
    currency: z.string().optional(),
  }),
  engagement: z.object({
    totalEventViews: z.number().int().min(0),
    totalEventFavorites: z.number().int().min(0),
    totalEventExpected: z.number().int().min(0),
    profileViews: z.number().int().min(0),
    producerFollowers: z.number().int().min(0),
  }),
  reviews: z
    .object({
      averageRating: z.number().nullable(),
      totalReviews: z.number().int().min(0),
    })
    .optional(),
  topEvents: z.array(producerDashboardTopEventSchema),
  eventEngagement: z.array(producerDashboardEventEngagementSchema),
});

export type ProducerDashboardTopEvent = z.infer<typeof producerDashboardTopEventSchema>;
export type ProducerDashboardMetricsResponse = z.infer<
  typeof producerDashboardMetricsResponseSchema
>;
