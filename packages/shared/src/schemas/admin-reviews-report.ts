import { z } from 'zod';
import { publicReviewCategorySchema } from './review-aspects';
import { reviewPublicStatusSchema } from './review-moderation';

export const adminReviewsReportQuerySchema = z.object({
  category: publicReviewCategorySchema.optional(),
  /** Ventana para señales recientes (ocultas, disputas) */
  days: z.coerce.number().int().min(1).max(365).optional().default(90),
});
export type AdminReviewsReportQuery = z.infer<typeof adminReviewsReportQuerySchema>;

export const adminReviewsReportExportQuerySchema = adminReviewsReportQuerySchema.extend({
  dataset: z.enum(['problematic', 'disputes']).optional().default('problematic'),
});
export type AdminReviewsReportExportQuery = z.infer<typeof adminReviewsReportExportQuerySchema>;

export const adminReviewsReportKpisSchema = z.object({
  totalPublicReviews: z.number().int().min(0),
  totalHiddenReviews: z.number().int().min(0),
  openDisputes: z.number().int().min(0),
  closedDisputes: z.number().int().min(0),
});
export type AdminReviewsReportKpis = z.infer<typeof adminReviewsReportKpisSchema>;

export const adminReviewsReportVerticalSchema = z.object({
  category: publicReviewCategorySchema,
  reviewCount: z.number().int().min(0),
  publicReviewCount: z.number().int().min(0),
  averageRating: z.number().nullable(),
});
export type AdminReviewsReportVertical = z.infer<typeof adminReviewsReportVerticalSchema>;

export const adminReviewsReportProblematicReviewSchema = z.object({
  id: z.string(),
  reviewId: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  eventCategory: publicReviewCategorySchema,
  overallRating: z.number().int().min(1).max(10),
  status: reviewPublicStatusSchema,
  hiddenFromPublic: z.boolean(),
  hasOpenDispute: z.boolean(),
  openDisputeId: z.string().nullable(),
  userDisplayName: z.string(),
  signal: z.enum(['low_rating', 'open_dispute', 'recently_hidden']),
  createdAt: z.string().datetime(),
  hiddenAt: z.string().datetime().nullable(),
  href: z.string(),
});
export type AdminReviewsReportProblematicReview = z.infer<
  typeof adminReviewsReportProblematicReviewSchema
>;

export const adminReviewsReportDisputedEntitySchema = z.object({
  eventId: z.string(),
  eventTitle: z.string(),
  eventCategory: publicReviewCategorySchema,
  producerDisplayName: z.string().nullable(),
  disputeCount: z.number().int().min(0),
  openDisputeCount: z.number().int().min(0),
  href: z.string(),
});
export type AdminReviewsReportDisputedEntity = z.infer<
  typeof adminReviewsReportDisputedEntitySchema
>;

export const adminReviewsReportResponseSchema = z.object({
  generatedAt: z.string().datetime(),
  /** Solo reseñas públicas V2; no incluye valoraciones comerciales B2B. */
  scopeNote: z.string(),
  kpis: adminReviewsReportKpisSchema,
  byVertical: z.array(adminReviewsReportVerticalSchema),
  problematicReviews: z.array(adminReviewsReportProblematicReviewSchema),
  topDisputedEntities: z.array(adminReviewsReportDisputedEntitySchema),
});
export type AdminReviewsReportResponse = z.infer<typeof adminReviewsReportResponseSchema>;
