import { z } from 'zod';

const hotelProfileStatusSchema = z.enum([
  'DRAFT',
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'SUSPENDED',
]);

const urlOptional = z
  .string()
  .max(2048)
  .nullable()
  .optional()
  .refine((s) => !s?.trim() || /^https?:\/\//i.test(s.trim()), {
    message: 'La URL debe empezar con http:// o https://',
  })
  .transform((s) => (s?.trim() ? s.trim() : null));

const hotelImageRefSchema = z
  .string()
  .min(1)
  .max(2_000_000)
  .refine(
    (s) =>
      /^https?:\/\//i.test(s.trim()) || s.trim().startsWith('data:image/'),
    'La imagen debe ser una URL https o un archivo de imagen válido',
  );

const galleryUrlsSchema = z.array(hotelImageRefSchema).max(20).optional();

export const hotelProfileSocialLinksSchema = z
  .object({
    instagram: z.string().max(500).optional(),
    facebook: z.string().max(500).optional(),
    tripadvisor: z.string().max(500).optional(),
    other: z.string().max(500).optional(),
  })
  .optional();

export const hotelProfileLocationSchema = z.object({
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(120),
  province: z.string().max(100).optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  googlePlaceId: z.string().max(255).nullable().optional(),
});

export const hotelProfileResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  displayName: z.string(),
  legalName: z.string().nullable(),
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  galleryUrls: z.array(z.string()).nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable().optional(),
  googlePlaceId: z.string().nullable().optional(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  starCategory: z.number().int().min(1).max(5).nullable(),
  contactPhone: z.string().nullable(),
  whatsappPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  bookingUrl: z.string().nullable(),
  socialLinks: hotelProfileSocialLinksSchema.nullable(),
  amenities: z.array(z.string()).nullable(),
  status: hotelProfileStatusSchema,
  publicEventId: z.string().nullable().optional(),
  ratingAvg: z.number().nullable(),
  ratingCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type HotelProfileResponse = z.infer<typeof hotelProfileResponseSchema>;

export const hotelProfileMeResponseSchema = z.object({
  profile: hotelProfileResponseSchema.nullable(),
});
export type HotelProfileMeResponse = z.infer<typeof hotelProfileMeResponseSchema>;

const amenitiesSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(24)
  .optional();

export const hotelProfileUpdateSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  legalName: z.string().max(200).nullable().optional(),
  description: z.string().max(10000).nullable().optional(),
  logoUrl: hotelImageRefSchema.nullable().optional(),
  bannerUrl: hotelImageRefSchema.nullable().optional(),
  galleryUrls: galleryUrlsSchema,
  location: hotelProfileLocationSchema.optional(),
  starCategory: z.number().int().min(1).max(5).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  whatsappPhone: z.string().max(40).nullable().optional(),
  contactEmail: z.union([z.string().email().max(200), z.literal('')]).optional(),
  websiteUrl: urlOptional,
  bookingUrl: urlOptional,
  socialLinks: hotelProfileSocialLinksSchema,
  amenities: amenitiesSchema,
});
export type HotelProfileUpdateInput = z.infer<typeof hotelProfileUpdateSchema>;
