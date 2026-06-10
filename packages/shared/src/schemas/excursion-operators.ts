import { z } from 'zod';
import { PUBLIC_SUMMARY_MAX_LENGTH } from '../constants/content-limits';
import {
  entitySocialLinksInputSchema,
  safeExternalUrlOptionalSchema,
} from './external-links';
import { EventStatus, EventMediaType } from '../enums';
import { eventMediaSchema, eventSummarySchema } from './events';
import { eventTagIdsSchema } from './content-tags';
import { excursionSubcategoryIdsInputSchema } from './event-subcategories';
import {
  excursionProductLocationInputSchema,
  excursionScheduleInputSchema,
} from './excursion-schedule';
import { rentalOpeningHoursSchema } from './opening-hours';
import { relatedLinksInputSchema } from './related-links';

const googlePlaceIdOptional = z.string().max(255).nullable().optional();
const provinceOptional = z.string().max(100).nullable().optional();

export const excursionOperatorSummarySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  openingHours: rentalOpeningHoursSchema.nullable(),
  openingHoursNote: z.string().nullable(),
  contactPhone: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  bookingUrl: z.string().nullable(),
  socialLinks: entitySocialLinksInputSchema,
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  excursionCount: z.number().int().min(0).optional(),
});
export type ExcursionOperatorSummary = z.infer<typeof excursionOperatorSummarySchema>;

export const excursionOperatorDetailSchema = excursionOperatorSummarySchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  excursions: z.array(eventSummarySchema).optional(),
});
export type ExcursionOperatorDetail = z.infer<typeof excursionOperatorDetailSchema>;

export const publicExcursionOperatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  openingHours: rentalOpeningHoursSchema.nullable(),
  openingHoursNote: z.string().nullable(),
  contactPhone: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  bookingUrl: z.string().nullable(),
  socialLinks: entitySocialLinksInputSchema,
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
});
export type PublicExcursionOperator = z.infer<typeof publicExcursionOperatorSchema>;

export const adminExcursionOperatorsListQuerySchema = z.object({
  tenantId: z.string().min(1).optional(),
  includeInactive: z.coerce.boolean().optional(),
});
export type AdminExcursionOperatorsListQuery = z.infer<
  typeof adminExcursionOperatorsListQuerySchema
>;

export const excursionOperatorIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type ExcursionOperatorIdParams = z.infer<typeof excursionOperatorIdParamsSchema>;

export const excursionProductIdParamsSchema = excursionOperatorIdParamsSchema.extend({
  excursionId: z.string().min(1),
});
export type ExcursionProductIdParams = z.infer<typeof excursionProductIdParamsSchema>;

export const createExcursionOperatorBodySchema = z.object({
  tenantId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  openingHours: rentalOpeningHoursSchema.nullable().optional(),
  openingHoursNote: z.string().max(500).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  websiteUrl: safeExternalUrlOptionalSchema,
  bookingUrl: safeExternalUrlOptionalSchema,
  socialLinks: entitySocialLinksInputSchema,
  geoLat: z.number().nullish(),
  geoLng: z.number().nullish(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type CreateExcursionOperatorBody = z.infer<typeof createExcursionOperatorBodySchema>;

export const updateExcursionOperatorBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  openingHours: rentalOpeningHoursSchema.nullable().optional(),
  openingHoursNote: z.string().max(500).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  websiteUrl: safeExternalUrlOptionalSchema,
  bookingUrl: safeExternalUrlOptionalSchema,
  socialLinks: entitySocialLinksInputSchema,
  geoLat: z.number().nullish(),
  geoLng: z.number().nullish(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type UpdateExcursionOperatorBody = z.infer<typeof updateExcursionOperatorBodySchema>;

export const adminExcursionOperatorsListResponseSchema = z.object({
  data: z.array(excursionOperatorSummarySchema),
});
export type AdminExcursionOperatorsListResponse = z.infer<
  typeof adminExcursionOperatorsListResponseSchema
>;

export const excursionProductGalleryImageSchema = z.object({
  url: z.string().min(1),
  type: z.nativeEnum(EventMediaType).optional(),
});

export const excursionProductSummarySchema = z
  .string()
  .max(
    PUBLIC_SUMMARY_MAX_LENGTH,
    `El resumen no puede superar ${PUBLIC_SUMMARY_MAX_LENGTH} caracteres`,
  )
  .optional()
  .nullable();

export const createExcursionProductBodySchema = z
  .object({
    title: z.string().min(1),
    summary: excursionProductSummarySchema,
    description: z.string().nullish(),
    subcategoryId: z.string().nullish(),
    subcategoryIds: excursionSubcategoryIdsInputSchema,
    headerImageUrl: z.string().nullish(),
    galleryImages: z.array(excursionProductGalleryImageSchema).optional(),
    coverImageUrl: z.string().nullish(),
    media: z.array(eventMediaSchema).optional(),
    status: z.nativeEnum(EventStatus).optional(),
    tagIds: eventTagIdsSchema.optional(),
    relatedLinks: relatedLinksInputSchema,
  })
  .merge(excursionScheduleInputSchema)
  .merge(excursionProductLocationInputSchema);
export type CreateExcursionProductBody = z.infer<typeof createExcursionProductBodySchema>;

export const updateExcursionProductBodySchema = z
  .object({
    title: z.string().min(1).optional(),
    summary: excursionProductSummarySchema,
    description: z.string().nullish(),
    subcategoryId: z.string().nullish(),
    subcategoryIds: excursionSubcategoryIdsInputSchema,
    headerImageUrl: z.string().nullish(),
    galleryImages: z.array(excursionProductGalleryImageSchema).optional(),
    coverImageUrl: z.string().nullish(),
    media: z.array(eventMediaSchema).optional(),
    status: z.nativeEnum(EventStatus).optional(),
    tagIds: eventTagIdsSchema.optional().nullable(),
    relatedLinks: relatedLinksInputSchema,
  })
  .merge(excursionScheduleInputSchema)
  .merge(excursionProductLocationInputSchema);
export type UpdateExcursionProductBody = z.infer<typeof updateExcursionProductBodySchema>;
