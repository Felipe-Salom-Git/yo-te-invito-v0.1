import { z } from 'zod';
import { PUBLIC_SUMMARY_MAX_LENGTH } from '../constants/content-limits';
import { EventStatus, EventMediaType } from '../enums';
import { eventMediaSchema, eventSummarySchema } from './events';
import { rentalOpeningHoursSchema } from './opening-hours';

const googlePlaceIdOptional = z.string().max(255).nullable().optional();
const provinceOptional = z.string().max(100).nullable().optional();
const cityOptional = z.string().max(120).nullable().optional();

const rentalPhoneOptional = z.string().max(40).nullable().optional();

const rentalUrlOptional = z
  .string()
  .url()
  .max(500)
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null));

const rentalEmailOptional = z
  .union([z.string().email().max(200), z.literal('')])
  .transform((v) => (v === '' ? null : v))
  .nullable()
  .optional();

export const rentalLocationSummarySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  city: cityOptional,
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  openingHours: rentalOpeningHoursSchema.nullable(),
  openingHoursNote: z.string().nullable(),
  contactPhone: z.string().nullable(),
  whatsappPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  productCount: z.number().int().min(0).optional(),
});
export type RentalLocationSummary = z.infer<typeof rentalLocationSummarySchema>;

export const rentalLocationDetailSchema = rentalLocationSummarySchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  products: z.array(eventSummarySchema).optional(),
});
export type RentalLocationDetail = z.infer<typeof rentalLocationDetailSchema>;

export const publicRentalLocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  city: cityOptional,
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  openingHours: rentalOpeningHoursSchema.nullable(),
  openingHoursNote: z.string().nullable(),
  whatsappPhone: z.string().nullable(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
});
export type PublicRentalLocation = z.infer<typeof publicRentalLocationSchema>;

export const adminRentalLocationsListQuerySchema = z.object({
  tenantId: z.string().min(1).optional(),
  includeInactive: z.coerce.boolean().optional(),
});
export type AdminRentalLocationsListQuery = z.infer<typeof adminRentalLocationsListQuerySchema>;

export const rentalLocationIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type RentalLocationIdParams = z.infer<typeof rentalLocationIdParamsSchema>;

export const rentalProductIdParamsSchema = rentalLocationIdParamsSchema.extend({
  productId: z.string().min(1),
});
export type RentalProductIdParams = z.infer<typeof rentalProductIdParamsSchema>;

export const createRentalLocationBodySchema = z.object({
  tenantId: z.string().min(1).optional(),
  name: z.string().min(1).max(200),
  address: z.string().max(500).nullable().optional(),
  city: cityOptional,
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  openingHours: rentalOpeningHoursSchema.nullable().optional(),
  openingHoursNote: z.string().max(500).nullable().optional(),
  contactPhone: rentalPhoneOptional,
  whatsappPhone: rentalPhoneOptional,
  contactEmail: rentalEmailOptional,
  websiteUrl: rentalUrlOptional,
  geoLat: z.number().nullish(),
  geoLng: z.number().nullish(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type CreateRentalLocationBody = z.infer<typeof createRentalLocationBodySchema>;

export const updateRentalLocationBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).nullable().optional(),
  city: cityOptional,
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  openingHours: rentalOpeningHoursSchema.nullable().optional(),
  openingHoursNote: z.string().max(500).nullable().optional(),
  contactPhone: rentalPhoneOptional,
  whatsappPhone: rentalPhoneOptional,
  contactEmail: rentalEmailOptional,
  websiteUrl: rentalUrlOptional,
  geoLat: z.number().nullish(),
  geoLng: z.number().nullish(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type UpdateRentalLocationBody = z.infer<typeof updateRentalLocationBodySchema>;

export const adminRentalLocationsListResponseSchema = z.object({
  data: z.array(rentalLocationSummarySchema),
});
export type AdminRentalLocationsListResponse = z.infer<
  typeof adminRentalLocationsListResponseSchema
>;

export const publicRentalLocationDetailResponseSchema = z.object({
  location: publicRentalLocationSchema,
  products: z.array(eventSummarySchema),
});
export type PublicRentalLocationDetailResponse = z.infer<
  typeof publicRentalLocationDetailResponseSchema
>;

export const rentalLocationOnEventDetailSchema = publicRentalLocationSchema.extend({
  products: z.array(eventSummarySchema).optional(),
});

export const eventDetailWithRentalLocationSchema = z.object({
  rentalLocation: publicRentalLocationSchema.nullable().optional(),
});

export const rentalProductGalleryImageSchema = z.object({
  url: z.string().min(1),
  type: z.nativeEnum(EventMediaType).optional(),
});

export const rentalProductSummarySchema = z
  .string()
  .max(
    PUBLIC_SUMMARY_MAX_LENGTH,
    `El resumen no puede superar ${PUBLIC_SUMMARY_MAX_LENGTH} caracteres`,
  )
  .optional()
  .nullable();

export const createRentalProductBodySchema = z.object({
  title: z.string().min(1),
  summary: rentalProductSummarySchema,
  description: z.string().nullish(),
  subcategoryId: z.string().nullish(),
  headerImageUrl: z.string().nullish(),
  galleryImages: z.array(rentalProductGalleryImageSchema).optional(),
  /** @deprecated use headerImageUrl */
  coverImageUrl: z.string().nullish(),
  /** @deprecated use galleryImages */
  media: z.array(eventMediaSchema).optional(),
  status: z.nativeEnum(EventStatus).optional(),
});
export type CreateRentalProductBody = z.infer<typeof createRentalProductBodySchema>;

/** Explicit partial schema — avoids Zod .partial() quirks with transformed fields */
export const updateRentalProductBodySchema = z.object({
  title: z.string().min(1).optional(),
  summary: rentalProductSummarySchema,
  description: z.string().nullish(),
  subcategoryId: z.string().nullish(),
  headerImageUrl: z.string().nullish(),
  galleryImages: z.array(rentalProductGalleryImageSchema).optional(),
  coverImageUrl: z.string().nullish(),
  media: z.array(eventMediaSchema).optional(),
  status: z.nativeEnum(EventStatus).optional(),
});
export type UpdateRentalProductBody = z.infer<typeof updateRentalProductBodySchema>;
