import { z } from 'zod';
import { publicReviewCategorySchema } from './review-aspects';

/** Internal ranking — never expose on public entity pages */
export const reviewRankingInternalSchema = z.object({
  bayesianRating: z.number(),
  rankingScore: z.number(),
  moderationPenalty: z.number(),
  validReviewCount: z.number().int().nonnegative(),
});

export type ReviewRankingInternal = z.infer<typeof reviewRankingInternalSchema>;

export const REVIEW_RANKING_DEFAULT_M = 20;
export const REVIEW_RANKING_DEFAULT_C = 8.0;

/** Minimum visible reviews for "Más recomendados" / "Mejor puntuados" carousels */
export const RECOMMENDED_LIST_MIN_VALID_REVIEWS = 10;

export const reviewEntitySummarySchema = z.object({
  averageRating: z.number().nullable(),
  validReviewCount: z.number().int().nonnegative(),
  aspectAverages: z.record(z.string(), z.number()).nullable(),
  recentReviewCount: z.number().int().nonnegative().optional(),
  verifiedReviewRatio: z.number().min(0).max(1).nullable().optional(),
  ratingBreakdown: z
    .record(z.string(), z.number().int().nonnegative())
    .optional(),
});

export type ReviewEntitySummary = z.infer<typeof reviewEntitySummarySchema>;

export const reviewEntitySummaryQuerySchema = z.object({
  tenantId: z.string().min(1),
  category: publicReviewCategorySchema,
  entityId: z.string().min(1),
});

export type ReviewEntitySummaryQuery = z.infer<typeof reviewEntitySummaryQuerySchema>;
