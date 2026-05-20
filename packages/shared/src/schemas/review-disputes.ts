import { z } from 'zod';

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
  'PENDING',
  'IN_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'RESOLVED',
]);
export type ProducerReviewDisputeFilter = z.infer<typeof producerReviewDisputeFilterSchema>;

export const producerManagedReviewListQuerySchema = z.object({
  eventId: z.string().min(1).optional(),
  rating: z.coerce.number().int().min(1).max(5).optional(),
  disputeStatus: producerReviewDisputeFilterSchema.optional().default('ALL'),
  sort: z.enum(['newest', 'oldest']).optional().default('newest'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type ProducerManagedReviewListQuery = z.infer<typeof producerManagedReviewListQuerySchema>;

export const producerManagedReviewSummarySchema = z.object({
  averageRating: z.number().nullable(),
  totalReviews: z.number(),
  distribution: z.object({
    '1': z.number(),
    '2': z.number(),
    '3': z.number(),
    '4': z.number(),
    '5': z.number(),
  }),
});
export type ProducerManagedReviewSummary = z.infer<typeof producerManagedReviewSummarySchema>;

export const producerManagedReviewListItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  score: z.number(),
  title: z.string().nullable(),
  comment: z.string().nullable(),
  userDisplayName: z.string(),
  hiddenFromPublic: z.boolean(),
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
