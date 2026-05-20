import { z } from 'zod';
import { eventMediaSchema } from './events';

export const generalPublicationCategorySchema = z.enum([
  'event',
  'gastro',
  'rental',
  'excursion',
  'hotel',
]);
export type GeneralPublicationCategory = z.infer<typeof generalPublicationCategorySchema>;

export const generalPublicationGalleryImageSchema = z.object({
  url: z.string().min(1),
  type: z.enum(['IMAGE', 'VIDEO']).optional(),
});

export const createGeneralPublicationBodySchema = z.object({
  category: generalPublicationCategorySchema,
  title: z.string().min(1),
  summary: z.string().max(220).nullable().optional(),
  description: z.string().nullish(),
  subcategoryId: z.string().nullish(),
  venueName: z.string().nullish(),
  city: z.string().nullish(),
  venueAddress: z.string().nullish(),
  geoLat: z.number().nullish(),
  geoLng: z.number().nullish(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullish(),
  capacityTotal: z.number().int().min(0).nullable().optional(),
  coverImageUrl: z.string().nullish(),
  headerImageUrl: z.string().nullish(),
  galleryImages: z.array(generalPublicationGalleryImageSchema).optional(),
  media: z.array(eventMediaSchema).optional(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'PAUSED', 'CANCELLED']).optional(),
});
export type CreateGeneralPublicationBody = z.infer<typeof createGeneralPublicationBodySchema>;

export const generalPublicationsListQuerySchema = z.object({
  status: z.string().optional(),
  category: generalPublicationCategorySchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type GeneralPublicationsListQuery = z.infer<typeof generalPublicationsListQuerySchema>;
