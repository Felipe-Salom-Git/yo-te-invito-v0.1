import { z } from 'zod';
import { publicReviewCategorySchema } from './review-aspects';
import { reviewPublicStatusSchema, reviewReplyAuthorTypeSchema } from './review-moderation';

export const reviewDisputeReasonTypeSchema = z.enum([
  'UNFAIR_RATING',
  'OFFENSIVE',
  'FALSE_INFORMATION',
  'WRONG_EVENT',
  'OTHER',
]);
export type ReviewDisputeReasonType = z.infer<typeof reviewDisputeReasonTypeSchema>;

export const reviewDisputeStatusSchema = z.enum([
  'PENDING',
  'IN_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'RESOLVED',
  'CANCELLED',
]);
export type ReviewDisputeStatus = z.infer<typeof reviewDisputeStatusSchema>;

export const producerReviewDisputeFilterSchema = z.enum([
  'ALL',
  'NONE',
  'OPEN',
  'PENDING',
  'IN_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'RESOLVED',
]);
export type ProducerReviewDisputeFilter = z.infer<typeof producerReviewDisputeFilterSchema>;

export const producerReviewReplyFilterSchema = z.enum(['ALL', 'UNANSWERED', 'ANSWERED']);
export type ProducerReviewReplyFilter = z.infer<typeof producerReviewReplyFilterSchema>;

const reviewScoreDistributionShape = {
  '1': z.number().int().nonnegative(),
  '2': z.number().int().nonnegative(),
  '3': z.number().int().nonnegative(),
  '4': z.number().int().nonnegative(),
  '5': z.number().int().nonnegative(),
  '6': z.number().int().nonnegative(),
  '7': z.number().int().nonnegative(),
  '8': z.number().int().nonnegative(),
  '9': z.number().int().nonnegative(),
  '10': z.number().int().nonnegative(),
} as const;

export function emptyReviewScoreDistribution(): Record<
  keyof typeof reviewScoreDistributionShape,
  number
> {
  return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0, '10': 0 };
}

export const producerManagedReviewListQuerySchema = z.object({
  eventId: z.string().min(1).optional(),
  /** Filter by overall score 1–10 (V2) */
  overallRating: z.coerce.number().int().min(1).max(10).optional(),
  /** @deprecated legacy 1–5 — use overallRating */
  rating: z.coerce.number().int().min(1).max(5).optional(),
  disputeStatus: producerReviewDisputeFilterSchema.optional().default('ALL'),
  replyFilter: producerReviewReplyFilterSchema.optional().default('ALL'),
  publicStatus: reviewPublicStatusSchema.optional(),
  sort: z.enum(['newest', 'oldest', 'highest', 'lowest']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type ProducerManagedReviewListQuery = z.infer<typeof producerManagedReviewListQuerySchema>;

export const producerManagedReviewSummarySchema = z.object({
  averageRating: z.number().nullable(),
  totalReviews: z.number(),
  distribution: z.object(reviewScoreDistributionShape),
  /** Portal productor: sin respuesta oficial */
  unansweredCount: z.number().int().nonnegative().optional(),
  /** Portal productor: disputas PENDING o IN_REVIEW */
  openDisputeCount: z.number().int().nonnegative().optional(),
});
export type ProducerManagedReviewSummary = z.infer<typeof producerManagedReviewSummarySchema>;

export const producerManagedReviewListItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  eventCategory: publicReviewCategorySchema,
  overallRating: z.number().int().min(1).max(10),
  /** Legacy 1–5 */
  score: z.number().int().min(1).max(5),
  aspectRatings: z.record(z.string(), z.number()).nullable(),
  title: z.string().nullable(),
  comment: z.string().nullable(),
  userDisplayName: z.string(),
  hiddenFromPublic: z.boolean(),
  status: reviewPublicStatusSchema,
  officialReply: z.string().nullable(),
  replyAuthorType: reviewReplyAuthorTypeSchema.nullable().optional(),
  replyUpdatedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  dispute: z
    .object({
      id: z.string(),
      status: reviewDisputeStatusSchema,
      reasonType: reviewDisputeReasonTypeSchema,
      adminNote: z.string().nullable(),
      createdAt: z.string().datetime(),
    })
    .nullable(),
});
export type ProducerManagedReviewListItem = z.infer<typeof producerManagedReviewListItemSchema>;

export const producerManagedReviewListResponseSchema = z.object({
  reviews: z.array(producerManagedReviewListItemSchema),
  page: z.number(),
  total: z.number(),
  events: z.array(z.object({ id: z.string(), title: z.string() })),
});
export type ProducerManagedReviewListResponse = z.infer<typeof producerManagedReviewListResponseSchema>;

export const createReviewDisputeSchema = z.object({
  reasonType: reviewDisputeReasonTypeSchema,
  message: z.string().trim().min(10).max(1000),
});
export type CreateReviewDisputeInput = z.infer<typeof createReviewDisputeSchema>;

export const reviewDisputeResponseSchema = z.object({
  id: z.string(),
  reviewId: z.string(),
  producerProfileId: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  reasonType: reviewDisputeReasonTypeSchema,
  message: z.string(),
  status: reviewDisputeStatusSchema,
  adminNote: z.string().nullable(),
  reviewScore: z.number(),
  reviewComment: z.string().nullable(),
  reviewUserDisplayName: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
});
export type ReviewDisputeResponse = z.infer<typeof reviewDisputeResponseSchema>;

export const adminReviewDisputeListQuerySchema = z.object({
  status: reviewDisputeStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});
export type AdminReviewDisputeListQuery = z.infer<typeof adminReviewDisputeListQuerySchema>;

export const adminReviewDisputeActionSchema = z.object({
  adminNote: z.string().trim().max(1000).optional(),
});
export type AdminReviewDisputeActionInput = z.infer<typeof adminReviewDisputeActionSchema>;

export const adminReviewDisputeListItemSchema = reviewDisputeResponseSchema.extend({
  producerDisplayName: z.string(),
});
export type AdminReviewDisputeListItem = z.infer<typeof adminReviewDisputeListItemSchema>;
