import { z } from 'zod';
import { reviewRatingScoreSchema } from './review-aspects';

export const commercialReviewTargetSchema = z.enum(['PRODUCER', 'REFERRER']);
export type CommercialReviewTarget = z.infer<typeof commercialReviewTargetSchema>;

/** Producer rates referrer — private B2B aspects */
export const commercialReferrerAspectKeys = [
  'referralQuality',
  'communication',
  'agreementCompliance',
  'commercialReliability',
] as const;

/** Referrer rates producer — private B2B aspects */
export const commercialProducerAspectKeys = [
  'commissionPayment',
  'communication',
  'metricsTransparency',
  'professionalTreatment',
] as const;

export const commercialReferrerAspectRatingsSchema = z.object({
  referralQuality: reviewRatingScoreSchema,
  communication: reviewRatingScoreSchema,
  agreementCompliance: reviewRatingScoreSchema,
  commercialReliability: reviewRatingScoreSchema,
});

export const commercialProducerAspectRatingsSchema = z.object({
  commissionPayment: reviewRatingScoreSchema,
  communication: reviewRatingScoreSchema,
  metricsTransparency: reviewRatingScoreSchema,
  professionalTreatment: reviewRatingScoreSchema,
});

export type CommercialReferrerAspectKey = keyof z.infer<
  typeof commercialReferrerAspectRatingsSchema
>;
export type CommercialProducerAspectKey = keyof z.infer<
  typeof commercialProducerAspectRatingsSchema
>;

/** Spanish labels for B2B aspect forms (private reviews). */
export const COMMERCIAL_REFERRER_ASPECT_LABELS_ES: Record<
  CommercialReferrerAspectKey,
  string
> = {
  referralQuality: 'Calidad de las referencias',
  communication: 'Comunicación',
  agreementCompliance: 'Cumplimiento de acuerdos',
  commercialReliability: 'Confiabilidad comercial',
};

export const COMMERCIAL_PRODUCER_ASPECT_LABELS_ES: Record<
  CommercialProducerAspectKey,
  string
> = {
  commissionPayment: 'Pago de comisiones',
  communication: 'Comunicación',
  metricsTransparency: 'Transparencia de métricas',
  professionalTreatment: 'Trato profesional',
};

export function parseCommercialAspectRatings(
  targetType: CommercialReviewTarget,
  raw: unknown,
): Record<string, number> {
  const schema =
    targetType === 'REFERRER'
      ? commercialReferrerAspectRatingsSchema
      : commercialProducerAspectRatingsSchema;
  return schema.parse(raw);
}

export function averageCommercialAspectScores(
  aspects: Record<string, number>,
): number {
  const values = Object.values(aspects);
  if (values.length === 0) return 1;
  return Math.min(
    10,
    Math.max(1, Math.round(values.reduce((a, b) => a + b, 0) / values.length)),
  );
}

/** Legacy 1–5 field kept for compatibility with older list UIs. */
export function legacyCommercialRatingFromOverall(overallRating: number): number {
  return Math.min(5, Math.max(1, Math.round(overallRating / 2)));
}

/** Body from portal POST (ids and target come from route + role). */
export const commercialRelationshipReviewSubmitSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    overallRating: reviewRatingScoreSchema.optional(),
    aspectRatings: z
      .union([
        commercialReferrerAspectRatingsSchema,
        commercialProducerAspectRatingsSchema,
      ])
      .optional(),
    comment: z.string().max(2000).optional(),
  })
  .refine((data) => data.aspectRatings != null || data.rating != null, {
    message: 'Indicá puntuación o los cuatro aspectos',
    path: ['rating'],
  });

export type CommercialRelationshipReviewSubmitInput = z.infer<
  typeof commercialRelationshipReviewSubmitSchema
>;

export const commercialRelationshipReviewCreateSchema = z
  .object({
    producerProfileId: z.string().min(1),
    referrerProfileId: z.string().min(1),
    targetType: commercialReviewTargetSchema,
    rating: z.number().int().min(1).max(5).optional(),
    overallRating: reviewRatingScoreSchema.optional(),
    aspectRatings: z
      .union([
        commercialReferrerAspectRatingsSchema,
        commercialProducerAspectRatingsSchema,
      ])
      .optional(),
    comment: z.string().max(2000).optional(),
  })
  .refine((data) => data.aspectRatings != null || data.rating != null, {
    message: 'rating or aspectRatings required',
    path: ['rating'],
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
  overallRating: z.number().nullable(),
  aspectRatings: z.record(z.string(), z.number()).nullable(),
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
