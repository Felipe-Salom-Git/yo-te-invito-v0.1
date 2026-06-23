import { z } from 'zod';

export const geoContextSchema = z.enum([
  'EVENT',
  'GASTRO',
  'RENTAL_LOCATION',
  'EXCURSION_OPERATOR',
  'EXCURSION_MEETING_POINT',
]);
export type GeoContext = z.infer<typeof geoContextSchema>;

export const geoConfidenceSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);
export type GeoConfidence = z.infer<typeof geoConfidenceSchema>;

export const resolveAddressBodySchema = z.object({
  address: z.string().min(1).max(500),
  city: z.string().min(1).max(120),
  province: z.string().min(1).max(120),
  country: z.string().max(80).default('Argentina'),
  context: geoContextSchema,
  /** Pre-composed geocoding query (street, city, province, country). Optional but preferred when sent. */
  query: z.string().min(1).max(600).optional(),
});
export type ResolveAddressBody = z.infer<typeof resolveAddressBodySchema>;

export const resolveAddressResponseSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  formattedAddress: z.string(),
  provider: z.literal('google'),
  confidence: geoConfidenceSchema,
  placeId: z.string().nullable().optional(),
});
export type ResolveAddressResponse = z.infer<typeof resolveAddressResponseSchema>;

export const geoProvinceOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
});
export type GeoProvinceOption = z.infer<typeof geoProvinceOptionSchema>;

export const geoLocalityOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  provinceId: z.string().optional(),
  provinceName: z.string().optional(),
});
export type GeoLocalityOption = z.infer<typeof geoLocalityOptionSchema>;

export const geoProvincesResponseSchema = z.object({
  provinces: z.array(geoProvinceOptionSchema),
});
export type GeoProvincesResponse = z.infer<typeof geoProvincesResponseSchema>;

export const geoLocalitiesQuerySchema = z.object({
  province: z.string().min(1).max(120),
});
export type GeoLocalitiesQuery = z.infer<typeof geoLocalitiesQuerySchema>;

export const geoLocalitiesResponseSchema = z.object({
  localities: z.array(geoLocalityOptionSchema),
});
export type GeoLocalitiesResponse = z.infer<typeof geoLocalitiesResponseSchema>;

/** Compose a full address string for geocoding only (not for DB storage). */
export function composeFullAddress(parts: {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  country?: string | null;
}): string {
  return [parts.address, parts.city, parts.province, parts.country ?? 'Argentina']
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(', ');
}
