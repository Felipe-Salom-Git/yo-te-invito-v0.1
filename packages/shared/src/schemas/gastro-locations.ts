import { z } from 'zod';
import { rentalOpeningHoursSchema } from './opening-hours';

const gastroProfileStatusSchema = z.enum([
  'DRAFT',
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
]);

const urlOptional = z
  .string()
  .url()
  .max(500)
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null));

/** https URL o data:image/* (subida desde el portal). */
const gastroImageRefSchema = z
  .string()
  .min(1)
  .max(2_000_000)
  .refine(
    (s) =>
      /^https?:\/\//i.test(s.trim()) ||
      s.trim().startsWith('data:image/'),
    'La imagen debe ser una URL https o un archivo de imagen válido',
  );

const galleryUrlsSchema = z.array(gastroImageRefSchema).max(30).optional();

export const gastroLocalLocationSchema = z.object({
  province: z.string().min(1).max(100),
  city: z.string().min(1).max(120),
  address: z.string().min(1).max(500),
  lat: z.number(),
  lng: z.number(),
});

export const gastroLocalResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  displayName: z.string(),
  legalName: z.string().nullable(),
  summary: z.string().nullable(),
  detail: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  galleryUrls: z.array(z.string()).nullable(),
  province: z.string().nullable(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  openingHours: rentalOpeningHoursSchema.nullable(),
  openingHoursNote: z.string().nullable(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  menuUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  subcategoryId: z.string().nullable(),
  publicEventId: z.string().nullable(),
  status: gastroProfileStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GastroLocalResponse = z.infer<typeof gastroLocalResponseSchema>;

export const gastroLocalCreateSchema = z.object({
  displayName: z.string().min(1).max(200),
  summary: z.string().max(220).nullable().optional(),
  detail: z.string().max(10000).nullable().optional(),
  subcategoryId: z
    .union([z.string().min(1), z.literal('')])
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional(),
  bannerUrl: gastroImageRefSchema.nullable().optional(),
  galleryUrls: galleryUrlsSchema,
  location: gastroLocalLocationSchema,
  openingHours: rentalOpeningHoursSchema.nullable().optional(),
  openingHoursNote: z.string().max(500).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  contactEmail: z.string().email().max(200),
  menuUrl: urlOptional,
  websiteUrl: urlOptional,
});
export type GastroLocalCreateInput = z.infer<typeof gastroLocalCreateSchema>;

export const gastroLocalUpdateSchema = gastroLocalCreateSchema.partial();
export type GastroLocalUpdateInput = z.infer<typeof gastroLocalUpdateSchema>;

export const publicGastroLocationSummarySchema = z.object({
  id: z.string(),
  publicEventId: z.string().nullable(),
  displayName: z.string(),
  summary: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  subcategoryName: z.string().nullable(),
});
export type PublicGastroLocationSummary = z.infer<typeof publicGastroLocationSummarySchema>;

export const publicGastroLocationDetailSchema = gastroLocalResponseSchema.extend({
  subcategoryName: z.string().nullable(),
  ratingAvg: z.number().nullable().optional(),
  ratingCount: z.number().int().optional(),
});
export type PublicGastroLocationDetail = z.infer<typeof publicGastroLocationDetailSchema>;

export const publicGastroLocationsListQuerySchema = z.object({
  tenantId: z.string().min(1),
  city: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type PublicGastroLocationsListQuery = z.infer<typeof publicGastroLocationsListQuerySchema>;
