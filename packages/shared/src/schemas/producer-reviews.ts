import { z } from 'zod';

export const producerReviewsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  minScore: z.coerce.number().int().min(1).max(5).optional(),
});

export type ProducerReviewsListQuery = z.infer<typeof producerReviewsListQuerySchema>;

export const producerReviewsSummarySchema = z.object({
  averageRating: z.number().nullable(),
  totalReviews: z.number(),
  distribution: z.object({
    5: z.number(),
    4: z.number(),
    3: z.number(),
    2: z.number(),
    1: z.number(),
  }),
});

export type ProducerReviewsSummary = z.infer<typeof producerReviewsSummarySchema>;

export const producerReviewListItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  userDisplayName: z.string(),
  createdAt: z.string().datetime(),
});

export type ProducerReviewListItem = z.infer<typeof producerReviewListItemSchema>;

export const producerReviewsListResponseSchema = z.object({
  reviews: z.array(producerReviewListItemSchema),
  page: z.number(),
  total: z.number(),
});

export type ProducerReviewsListResponse = z.infer<typeof producerReviewsListResponseSchema>;
