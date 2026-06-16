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
