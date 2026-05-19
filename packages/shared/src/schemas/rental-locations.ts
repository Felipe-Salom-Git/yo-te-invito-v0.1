import { z } from 'zod';
import { EventStatus, EventMediaType } from '../enums';
import { eventMediaSchema, eventSummarySchema } from './events';
import { rentalOpeningHoursSchema } from './opening-hours';

export const rentalLocationSummarySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  address: z.string().nullable(),
  openingHours: rentalOpeningHoursSchema.nullable(),
  openingHoursNote: z.string().nullable(),
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
  openingHours: rentalOpeningHoursSchema.nullable(),
  openingHoursNote: z.string().nullable(),
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
  openingHours: rentalOpeningHoursSchema.nullable().optional(),
  openingHoursNote: z.string().max(500).nullable().optional(),
  geoLat: z.number().nullish(),
  geoLng: z.number().nullish(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type CreateRentalLocationBody = z.infer<typeof createRentalLocationBodySchema>;

export const updateRentalLocationBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).nullable().optional(),
  openingHours: rentalOpeningHoursSchema.nullable().optional(),
  openingHoursNote: z.string().max(500).nullable().optional(),
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

export const createRentalProductBodySchema = z.object({
  title: z.string().min(1),
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

export const updateRentalProductBodySchema = createRentalProductBodySchema.partial();
export type UpdateRentalProductBody = z.infer<typeof updateRentalProductBodySchema>;
