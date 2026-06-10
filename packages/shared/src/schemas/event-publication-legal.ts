import { z } from 'zod';

/** GET /producer/events/:eventId/legal/publication-terms */
export const eventPublicationLegalStatusSchema = z.object({
  eventId: z.string(),
  documentKey: z.literal('producer_terms'),
  documentPublished: z.boolean(),
  documentVersionId: z.string().nullable(),
  version: z.string().nullable(),
  title: z.string().nullable(),
  publicPath: z.string().nullable(),
  accepted: z.boolean(),
  acceptedAt: z.string().datetime().nullable(),
  acceptedVersionId: z.string().nullable(),
  requiresNewAcceptance: z.boolean(),
});
export type EventPublicationLegalStatus = z.infer<typeof eventPublicationLegalStatusSchema>;

/** POST /producer/events/:eventId/legal/accept-publication-terms */
export const eventPublicationLegalAcceptResponseSchema = z.object({
  eventId: z.string(),
  documentKey: z.literal('producer_terms'),
  documentVersionId: z.string(),
  version: z.string(),
  acceptedAt: z.string().datetime(),
  alreadyAccepted: z.boolean(),
});
export type EventPublicationLegalAcceptResponse = z.infer<
  typeof eventPublicationLegalAcceptResponseSchema
>;
