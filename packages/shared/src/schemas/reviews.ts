import { z } from 'zod';
import {
  buildAspectRatingsSchema,
  publicReviewCategorySchema,
  reviewRatingScoreSchema,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
} from './review-aspects';
import {
  reviewPublicStatusSchema,
  reviewReplyAuthorTypeSchema,
  reviewReplyBodySchema,
} from './review-moderation';

export const REVIEW_COMMENT_MIN = 10;
export const REVIEW_COMMENT_MAX = 2000;

export const reviewCommentSchema = z
  .string()
  .trim()
  .min(REVIEW_COMMENT_MIN, `El comentario debe tener al menos ${REVIEW_COMMENT_MIN} caracteres`)
  .max(REVIEW_COMMENT_MAX);

const createPublicReviewBodyObjectSchema = z.object({
  overallRating: reviewRatingScoreSchema,
  aspectRatings: z.record(z.string(), reviewRatingScoreSchema),
  comment: reviewCommentSchema,
  title: z.string().trim().max(120).optional(),
});

/** V2 create body — aspect keys validated per category in API service. */
export const createPublicReviewBodySchema = createPublicReviewBodyObjectSchema;

export type CreatePublicReviewBody = z.infer<typeof createPublicReviewBodySchema>;

export const meCreatePublicReviewBodySchema = createPublicReviewBodyObjectSchema.extend({
  eventId: z.string().min(1),
});

export type MeCreatePublicReviewBody = z.infer<typeof meCreatePublicReviewBodySchema>;

export function createPublicReviewBodyForCategorySchema(
  category: z.infer<typeof publicReviewCategorySchema>,
) {
  return z.object({
    overallRating: reviewRatingScoreSchema,
    aspectRatings: buildAspectRatingsSchema(category),
    comment: reviewCommentSchema,
    title: z.string().trim().max(120).optional(),
  });
}

export const userReviewerTierSchema = z.enum([
  'NEW',
  'ACTIVE',
  'TRUSTED',
  'UNDER_OBSERVATION',
  'LOW_RELIABILITY',
]);
export type UserReviewerTier = z.infer<typeof userReviewerTierSchema>;

export const USER_REVIEWER_TIER_LABELS_ES: Record<UserReviewerTier, string> = {
  NEW: 'Nuevo',
  ACTIVE: 'Activo',
  TRUSTED: 'Confiable',
  UNDER_OBSERVATION: 'En observación',
  LOW_RELIABILITY: 'Baja confiabilidad',
};

export const publicReviewAuthorSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  reviewerTier: userReviewerTierSchema,
});

export type PublicReviewAuthor = z.infer<typeof publicReviewAuthorSchema>;

export const publicReviewReplySchema = z.object({
  body: z.string(),
  authorType: reviewReplyAuthorTypeSchema,
  authorDisplayName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable().optional(),
});

export type PublicReviewReply = z.infer<typeof publicReviewReplySchema>;

export const publicReviewItemV2Schema = z.object({
  id: z.string(),
  category: publicReviewCategorySchema,
  entityId: z.string(),
  entityTitle: z.string(),
  overallRating: z.number().int().min(REVIEW_RATING_MIN).max(REVIEW_RATING_MAX),
  aspectRatings: z.record(z.string(), z.number()),
  comment: z.string().nullable(),
  title: z.string().nullable(),
  status: reviewPublicStatusSchema,
  isVerified: z.boolean(),
  author: publicReviewAuthorSchema,
  reply: publicReviewReplySchema.nullable(),
  createdAt: z.string().datetime(),
  /** Legacy 1–5 score for backward compatibility during migration */
  legacyScore: z.number().int().min(1).max(5).optional(),
});

export type PublicReviewItemV2 = z.infer<typeof publicReviewItemV2Schema>;

export const publicReviewsListQuerySchema = z.object({
  tenantId: z.string().min(1),
  category: publicReviewCategorySchema,
  entityId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type PublicReviewsListQuery = z.infer<typeof publicReviewsListQuerySchema>;

export const publicReviewsListResponseSchema = z.object({
  reviews: z.array(publicReviewItemV2Schema),
  page: z.number(),
  total: z.number(),
  summary: z.object({
    averageRating: z.number().nullable(),
    validReviewCount: z.number().int().nonnegative(),
    aspectAverages: z.record(z.string(), z.number()).nullable(),
  }),
});

export type PublicReviewsListResponse = z.infer<typeof publicReviewsListResponseSchema>;

export const userPublicReviewProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable().optional(),
  reviewerTier: userReviewerTierSchema,
  visibleReviewCount: z.number().int().nonnegative(),
});

export type UserPublicReviewProfile = z.infer<typeof userPublicReviewProfileSchema>;

export const userPublicReviewsQuerySchema = z.object({
  tenantId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type UserPublicReviewsQuery = z.infer<typeof userPublicReviewsQuerySchema>;

export const userPublicReviewsResponseSchema = z.object({
  profile: userPublicReviewProfileSchema,
  reviews: z.array(publicReviewItemV2Schema),
  page: z.number(),
  total: z.number(),
});

export type UserPublicReviewsResponse = z.infer<typeof userPublicReviewsResponseSchema>;

export { reviewReplyBodySchema };
