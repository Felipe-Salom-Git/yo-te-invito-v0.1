// Shared profile payloads for signup (POST /auth/register) and apply (POST /profiles/.../apply).
// Slice 3 — single source of truth per profile type (RENTAL excluded from V2 signup).
import { z } from 'zod';
import { cityLabelFromValue, provinceLabelFromValue } from '../location/labels';

/** Profile type chosen during public registration (not ADMIN / SCANNER / RENTAL). */
export const registrationProfileTypeSchema = z.enum([
  'USER',
  'PRODUCER',
  'GASTRO',
  'HOTEL',
  'REFERRER',
]);
export type RegistrationProfileType = z.infer<typeof registrationProfileTypeSchema>;

const trimmedString = (min: number, max: number, label = 'Campo') =>
  z
    .string()
    .trim()
    .min(min, `${label} requerido`)
    .max(max);

const httpsUrlSchema = z
  .string()
  .trim()
  .min(1, 'URL requerida')
  .max(2048)
  .refine((s) => /^https?:\/\//i.test(s), {
    message: 'La URL debe empezar con http:// o https://',
  });

// ─── PRODUCER ───────────────────────────────────────────────────────────────

export const producerProfileBaseSchema = z.object({
  displayName: trimmedString(1, 200, 'Nombre de la productora'),
  legalName: z.string().trim().max(200).optional(),
  city: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5000).optional(),
  shortDescription: z.string().trim().max(500).optional(),
  longDescription: z.string().trim().max(10000).optional(),
  slug: z.string().trim().max(120).optional(),
  primaryPhone: z.string().trim().max(40).optional(),
  primaryEmail: z.string().trim().email().optional(),
});
export type ProducerProfileBaseInput = z.infer<typeof producerProfileBaseSchema>;

/** Signup minimum: displayName required in UI; city/description optional if sent. */
export const producerProfileSignupSchema = producerProfileBaseSchema.pick({
  displayName: true,
  city: true,
  description: true,
});
export type ProducerProfileSignupInput = z.infer<typeof producerProfileSignupSchema>;

/** Apply: same minimum; extra fields optional for logged-in onboarding. */
export const producerProfileApplySchema = producerProfileBaseSchema;
export type ProducerProfileApplyInput = z.infer<typeof producerProfileApplySchema>;

// ─── GASTRO ─────────────────────────────────────────────────────────────────

export const gastroProfileLocationSchema = z.object({
  province: trimmedString(1, 100, 'Seleccioná una provincia.'),
  city: trimmedString(1, 120, 'Seleccioná una ciudad.'),
  address: trimmedString(1, 500, 'Ingresá la dirección del local.'),
  lat: z.number().finite().optional(),
  lng: z.number().finite().optional(),
});
export type GastroProfileLocationInput = z.infer<typeof gastroProfileLocationSchema>;

export const gastroProfileBaseSchema = z.object({
  displayName: trimmedString(1, 200, 'Nombre del local'),
  contactEmail: z.string().trim().email('Email de contacto inválido').max(200),
  summary: z.string().trim().max(220).optional(),
  location: gastroProfileLocationSchema,
  legalName: z.string().trim().max(200).optional(),
  contactPhone: z.string().trim().max(40).optional(),
});
export type GastroProfileBaseInput = z.infer<typeof gastroProfileBaseSchema>;

export const gastroProfileSignupSchema = gastroProfileBaseSchema.pick({
  displayName: true,
  contactEmail: true,
  summary: true,
  location: true,
});
export type GastroProfileSignupInput = z.infer<typeof gastroProfileSignupSchema>;

export const gastroProfileApplySchema = gastroProfileBaseSchema;
export type GastroProfileApplyInput = z.infer<typeof gastroProfileApplySchema>;

/** Normalized shape for Prisma create (register + apply). */
export type GastroProfilePersistInput = {
  displayName: string;
  contactEmail: string;
  summary: string | null;
  province: string;
  city: string;
  address: string;
  geoLat: number | null;
  geoLng: number | null;
  legalName: string | null;
  contactPhone: string | null;
};

export function gastroProfileToPersistInput(
  body: GastroProfileSignupInput | GastroProfileApplyInput,
): GastroProfilePersistInput {
  const lat = body.location.lat;
  const lng = body.location.lng;
  const provinceRaw = body.location.province.trim();
  const cityRaw = body.location.city.trim();
  return {
    displayName: body.displayName,
    contactEmail: body.contactEmail,
    summary: body.summary?.trim() || null,
    province: provinceLabelFromValue(provinceRaw) || provinceRaw,
    city: cityLabelFromValue(cityRaw) || cityRaw,
    address: body.location.address.trim(),
    geoLat: lat != null && Number.isFinite(lat) ? lat : null,
    geoLng: lng != null && Number.isFinite(lng) ? lng : null,
    legalName: 'legalName' in body && body.legalName?.trim() ? body.legalName.trim() : null,
    contactPhone:
      'contactPhone' in body && body.contactPhone?.trim() ? body.contactPhone.trim() : null,
  };
}

// ─── HOTEL ──────────────────────────────────────────────────────────────────

/** Province/city slugs at signup (distinct from portal `hotelProfileLocationSchema` with address/geo). */
export const hotelSignupLocationSchema = z.object({
  province: trimmedString(1, 100, 'Seleccioná una provincia.'),
  city: trimmedString(1, 120, 'Seleccioná una ciudad.'),
});
export type HotelSignupLocationInput = z.infer<typeof hotelSignupLocationSchema>;

export const hotelProfileBaseSchema = z.object({
  displayName: trimmedString(1, 200, 'Nombre del establecimiento'),
  websiteUrl: httpsUrlSchema,
  location: hotelSignupLocationSchema.optional(),
  city: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5000).optional(),
  legalName: z.string().trim().max(200).optional(),
  address: z.string().trim().max(500).optional(),
  starCategory: z.number().int().min(1).max(5).optional(),
  contactPhone: z.string().trim().max(40).optional(),
  contactEmail: z.union([z.string().trim().email(), z.literal('')]).optional(),
  bookingUrl: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .refine((s) => !s || /^https?:\/\//i.test(s), {
      message: 'La URL de reservas debe empezar con http:// o https://',
    }),
  socialLinks: z
    .object({
      instagram: z.string().trim().max(500).optional(),
      facebook: z.string().trim().max(500).optional(),
      tripadvisor: z.string().trim().max(500).optional(),
      other: z.string().trim().max(500).optional(),
    })
    .optional(),
});
export type HotelProfileBaseInput = z.infer<typeof hotelProfileBaseSchema>;

/** Signup: displayName, websiteUrl, province/city (no address/geo at signup). */
export const hotelProfileSignupSchema = z.object({
  displayName: trimmedString(1, 200, 'Nombre del establecimiento'),
  websiteUrl: httpsUrlSchema,
  location: hotelSignupLocationSchema,
});
export type HotelProfileSignupInput = z.infer<typeof hotelProfileSignupSchema>;

export const hotelProfileApplySchema = hotelProfileBaseSchema;
export type HotelProfileApplyInput = z.infer<typeof hotelProfileApplySchema>;

export type HotelProfilePersistInput = {
  displayName: string;
  websiteUrl: string;
  city: string | null;
  address: string | null;
  description: string | null;
};

export function hotelProfileToPersistInput(
  body: HotelProfileSignupInput | HotelProfileApplyInput,
): HotelProfilePersistInput {
  if ('location' in body && body.location && 'province' in body.location) {
    const loc = body.location;
    return {
      displayName: body.displayName,
      websiteUrl: body.websiteUrl,
      city: cityLabelFromValue(loc.city) || loc.city,
      address: provinceLabelFromValue(loc.province) || loc.province,
      description: 'description' in body && body.description?.trim() ? body.description.trim() : null,
    };
  }
  const apply = body as HotelProfileApplyInput;
  return {
    displayName: apply.displayName,
    websiteUrl: apply.websiteUrl,
    city: apply.city?.trim() || null,
    address: apply.address?.trim() || null,
    description: apply.description?.trim() || null,
  };
}

// ─── REFERRER ───────────────────────────────────────────────────────────────

export const referrerProfileBaseSchema = z.object({
  displayName: trimmedString(1, 200, 'Nombre público'),
  bio: z.string().trim().max(500).optional(),
  longBio: z.string().trim().max(5000).optional(),
  avatarUrl: z.string().trim().max(2048).optional(),
  city: z.string().trim().max(120).optional(),
  region: z.string().trim().max(120).optional(),
  publicVisibility: z.boolean().optional(),
});
export type ReferrerProfileBaseInput = z.infer<typeof referrerProfileBaseSchema>;

/** Signup UI (Slice 10): solo `displayName`. `bio`/`city` quedan para portal/apply. */
export const referrerProfileSignupSchema = referrerProfileBaseSchema.pick({
  displayName: true,
  bio: true,
  city: true,
});
export type ReferrerProfileSignupInput = z.infer<typeof referrerProfileSignupSchema>;

export const referrerProfileApplySchema = referrerProfileBaseSchema;
export type ReferrerProfileApplyInput = z.infer<typeof referrerProfileApplySchema>;

// ─── Parsers ────────────────────────────────────────────────────────────────

const COMMERCIAL_PROFILE_TYPES = ['PRODUCER', 'GASTRO', 'HOTEL', 'REFERRER'] as const;
export type CommercialProfileType = (typeof COMMERCIAL_PROFILE_TYPES)[number];

export function isCommercialProfileType(
  type: RegistrationProfileType,
): type is CommercialProfileType {
  return (COMMERCIAL_PROFILE_TYPES as readonly string[]).includes(type);
}

const signupSchemaByType = {
  PRODUCER: producerProfileSignupSchema,
  GASTRO: gastroProfileSignupSchema,
  HOTEL: hotelProfileSignupSchema,
  REFERRER: referrerProfileSignupSchema,
} as const;

const applySchemaByType = {
  PRODUCER: producerProfileApplySchema,
  GASTRO: gastroProfileApplySchema,
  HOTEL: hotelProfileApplySchema,
  REFERRER: referrerProfileApplySchema,
} as const;

export type ParsedProfileSignupSuccess =
  | { profileType: 'USER'; data: null }
  | { profileType: 'PRODUCER'; data: ProducerProfileSignupInput }
  | { profileType: 'GASTRO'; data: GastroProfileSignupInput }
  | { profileType: 'HOTEL'; data: HotelProfileSignupInput }
  | { profileType: 'REFERRER'; data: ReferrerProfileSignupInput };

export function parseProfileSignupData(
  profileType: RegistrationProfileType,
  profileData: unknown,
): { success: true } & ParsedProfileSignupSuccess | { success: false; error: z.ZodError } {
  if (profileType === 'USER') {
    if (profileData != null && profileData !== undefined) {
      return {
        success: false,
        error: new z.ZodError([
          {
            code: 'custom',
            message: 'profileData no debe enviarse para perfil USER',
            path: [],
          },
        ]),
      };
    }
    return { success: true, profileType: 'USER', data: null };
  }

  if (!isCommercialProfileType(profileType)) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          message: 'Tipo de perfil no válido para registro (RENTAL no soportado en V2)',
          path: ['profileType'],
        },
      ]),
    };
  }

  const schema = signupSchemaByType[profileType];
  const parsed = schema.safeParse(profileData);
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }
  return { success: true, profileType, data: parsed.data } as { success: true } & ParsedProfileSignupSuccess;
}

export function parseProfileApplyData(
  profileType: CommercialProfileType,
  profileData: unknown,
):
  | { success: true; data: ProducerProfileApplyInput | GastroProfileApplyInput | HotelProfileApplyInput | ReferrerProfileApplyInput }
  | { success: false; error: z.ZodError } {
  const schema = applySchemaByType[profileType];
  const parsed = schema.safeParse(profileData);
  if (!parsed.success) {
    return { success: false, error: parsed.error };
  }
  return { success: true, data: parsed.data };
}

/** Validates register body profileData after base fields parsed. */
export function validateAuthRegisterProfilePayload(
  profileType: RegistrationProfileType | undefined,
  profileData: unknown,
): z.SafeParseReturnType<unknown, unknown> {
  const type = profileType ?? 'USER';
  const result = parseProfileSignupData(type, profileData);
  if (!result.success) {
    return { success: false, error: result.error };
  }
  return { success: true, data: result.data };
}
