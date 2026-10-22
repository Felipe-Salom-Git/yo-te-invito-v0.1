import { z } from 'zod';

/** POST /public/gastro-locations/:id/view */
export const publicGastroProfileViewQuerySchema = z.object({
  tenantId: z.string().min(1),
});
export type PublicGastroProfileViewQuery = z.infer<typeof publicGastroProfileViewQuerySchema>;

export const publicGastroProfileViewResponseSchema = z.object({
  recorded: z.boolean(),
});
export type PublicGastroProfileViewResponse = z.infer<
  typeof publicGastroProfileViewResponseSchema
>;

export const gastroProfileMetricsDayBucketSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  views: z.number().int().min(0),
});
export type GastroProfileMetricsDayBucket = z.infer<
  typeof gastroProfileMetricsDayBucketSchema
>;

/** GET /gastro/metrics?profileId= — operational profile page-view metrics. */
export const gastroProfileMetricsResponseSchema = z.object({
  gastroProfileId: z.string(),
  timezone: z.string(),
  totalViews: z.number().int().min(0),
  viewsToday: z.number().int().min(0),
  viewsLast7Days: z.number().int().min(0),
  viewsLast30Days: z.number().int().min(0),
  viewsByDay: z.array(gastroProfileMetricsDayBucketSchema),
  activeDiscounts: z.number().int().min(0).optional(),
  totalClaims: z.number().int().min(0).optional(),
  totalValidations: z.number().int().min(0).optional(),
});
export type GastroProfileMetricsResponse = z.infer<
  typeof gastroProfileMetricsResponseSchema
>;
