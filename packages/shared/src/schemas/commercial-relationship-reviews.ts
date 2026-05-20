import { z } from 'zod';

export const commercialReviewTargetSchema = z.enum(['PRODUCER', 'REFERRER']);
export type CommercialReviewTarget = z.infer<typeof commercialReviewTargetSchema>;

/** Body from portal POST (ids and target come from route + role). */
export const commercialRelationshipReviewSubmitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export type CommercialRelationshipReviewSubmitInput = z.infer<
  typeof commercialRelationshipReviewSubmitSchema
>;

export const commercialRelationshipReviewCreateSchema = z.object({
  producerProfileId: z.string().min(1),
  referrerProfileId: z.string().min(1),
  targetType: commercialReviewTargetSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export type CommercialRelationshipReviewCreateInput = z.infer<
  typeof commercialRelationshipReviewCreateSchema
>;

export const commercialRelationshipReviewResponseSchema = z.object({
  id: z.string(),
  producerProfileId: z.string(),
  referrerProfileId: z.string(),
  relationshipId: z.string().nullable(),
  reviewerUserId: z.string(),
  reviewerRole: z.enum(['PRODUCER', 'REFERRER']),
  targetType: commercialReviewTargetSchema,
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CommercialRelationshipReviewResponse = z.infer<
  typeof commercialRelationshipReviewResponseSchema
>;

export const commercialRelationshipReviewSummarySchema = z.object({
  averageRating: z.number().nullable(),
  totalReviews: z.number(),
});

export type CommercialRelationshipReviewSummary = z.infer<
  typeof commercialRelationshipReviewSummarySchema
>;
