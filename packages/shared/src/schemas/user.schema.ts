import { z } from 'zod';
import { Role, UserStatus } from '../enums';

/** Profile summary for availableProfiles in GET /me */
export const meProfileSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  status: z.string(),
  membershipRole: z.string().optional(),
});
export type MeProfileSummary = z.infer<typeof meProfileSummarySchema>;

/** Operational profiles available to the user */
export const meAvailableProfilesSchema = z.object({
  tickets: z.literal(true),
  producer: z
    .object({
      hasAccess: z.boolean(),
      profiles: z.array(meProfileSummarySchema).default([]),
    })
    .optional()
    .default({ hasAccess: false, profiles: [] }),
  gastro: z
    .object({
      hasAccess: z.boolean(),
      profiles: z.array(meProfileSummarySchema).default([]),
    })
    .optional()
    .default({ hasAccess: false, profiles: [] }),
  hotel: z
    .object({
      hasAccess: z.boolean(),
      profiles: z.array(meProfileSummarySchema).default([]),
    })
    .optional()
    .default({ hasAccess: false, profiles: [] }),
  referrer: z
    .object({
      hasAccess: z.boolean(),
      profiles: z.array(meProfileSummarySchema).default([]),
    })
    .optional()
    .default({ hasAccess: false, profiles: [] }),
});
export type MeAvailableProfiles = z.infer<typeof meAvailableProfilesSchema>;

/** Response for GET /me */
export const meResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string(),
  role: z.nativeEnum(Role),
  status: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  availableProfiles: meAvailableProfilesSchema.optional(),
});
export type MeResponse = z.infer<typeof meResponseSchema>;

/** Query for GET /me/tickets (optional pagination later) */
export const meTicketsQuerySchema = z.object({});
export type MeTicketsQuery = z.infer<typeof meTicketsQuerySchema>;

/** Single ticket item for GET /me/tickets */
export const meTicketItemSchema = z.object({
  ticketId: z.string(),
  status: z.string(),
  qrPayload: z.string(),
  usedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  event: z.object({
    id: z.string(),
    title: z.string(),
    startAt: z.string().datetime(),
    venueName: z.string().nullable(),
    city: z.string().nullable().optional(),
  }),
  ticketType: z.object({
    id: z.string(),
    name: z.string(),
  }),
  ticketBatchId: z.string().nullable().optional(),
});
export type MeTicketItem = z.infer<typeof meTicketItemSchema>;

/** Response for GET /me/tickets */
export const meTicketsResponseSchema = z.object({
  tickets: z.array(meTicketItemSchema),
});
export type MeTicketsResponse = z.infer<typeof meTicketsResponseSchema>;

/** Query for GET /me/orders (optional pagination) */
export const meOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type MeOrdersQuery = z.infer<typeof meOrdersQuerySchema>;

/**
 * Create user request schema
 */
export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.nativeEnum(Role),
  status: z.nativeEnum(UserStatus).default(UserStatus.ACTIVE),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/** Request body for POST /auth/login */
export const authLoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantId: z.string().optional(),
});
export type AuthLoginRequest = z.infer<typeof authLoginRequestSchema>;

/** User payload in login response (same shape as GET /me) */
export const authLoginUserSchema = meResponseSchema;
export type AuthLoginUser = z.infer<typeof authLoginUserSchema>;

/** Response for POST /auth/login */
export const authLoginResponseSchema = z.object({
  token: z.string(),
  user: authLoginUserSchema,
});
export type AuthLoginResponse = z.infer<typeof authLoginResponseSchema>;

/** Profile type chosen during public registration (not ADMIN / SCANNER). */
export const registrationProfileTypeSchema = z.enum([
  'USER',
  'PRODUCER',
  'GASTRO',
  'HOTEL',
  'REFERRER',
]);
export type RegistrationProfileType = z.infer<typeof registrationProfileTypeSchema>;

/** Request body for POST /auth/register */
export const authRegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  city: z.string().max(120).optional(),
  tenantId: z.string().optional(),
  profileType: registrationProfileTypeSchema.optional().default('USER'),
  profileData: z.unknown().optional(),
});
export type AuthRegisterRequest = z.infer<typeof authRegisterRequestSchema>;

/** Response for POST /auth/register (same shape as login) */
export const authRegisterResponseSchema = authLoginResponseSchema;
export type AuthRegisterResponse = z.infer<typeof authRegisterResponseSchema>;

/** Order summary for GET /me/orders (minimal for list) */
export const meOrderItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  status: z.string(),
  buyerEmail: z.string(),
  totalAmount: z.string(),
  currency: z.string(),
  createdAt: z.string().datetime(),
});
export type MeOrderItem = z.infer<typeof meOrderItemSchema>;

/** Response for GET /me/orders */
export const meOrdersResponseSchema = z.object({
  orders: z.array(meOrderItemSchema),
});
export type MeOrdersResponse = z.infer<typeof meOrdersResponseSchema>;

const idListSchema = z.array(z.string().min(1)).max(100);

/**
 * Legacy preferences (GET/PATCH /me/preferences).
 * @deprecated Use `userPortalPreferencesSchema` + `UserFavorite` / `UserExpectedEvent` tables.
 * `favoriteEventIds` / `expectedEventIds` remain readable during migration only.
 */
export const userPreferencesSchema = z.object({
  userId: z.string(),
  preferredCity: z.string().nullable(),
  notifyNewEvents: z.boolean(),
  notifyReminders: z.boolean(),
  /** @deprecated Migrar a UserFavorite — no escribir en código nuevo */
  favoriteEventIds: idListSchema.default([]),
  /** @deprecated Migrar a UserExpectedEvent — no escribir en código nuevo */
  expectedEventIds: idListSchema.default([]),
});
export type UserPreferences = z.infer<typeof userPreferencesSchema>;

/** @deprecated Prefer `userPortalPreferencesPatchSchema` for portal V1 */
export const userPreferencesPatchSchema = z.object({
  preferredCity: z.string().nullable().optional(),
  notifyNewEvents: z.boolean().optional(),
  notifyReminders: z.boolean().optional(),
  favoriteEventIds: idListSchema.optional(),
  expectedEventIds: idListSchema.optional(),
});
export type UserPreferencesPatch = z.infer<typeof userPreferencesPatchSchema>;

/** Admin: list users query */
export const adminUsersListQuerySchema = z.object({
  tenantId: z.string().optional(),
  role: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type AdminUsersListQuery = z.infer<typeof adminUsersListQuerySchema>;

/** Admin: create referrer body */
export const adminCreateReferrerBodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6).optional(),
});
export type AdminCreateReferrerBody = z.infer<typeof adminCreateReferrerBodySchema>;

/** Admin: update role body */
export const adminUpdateRoleBodySchema = z.object({
  role: z.string().min(1),
});
export type AdminUpdateRoleBody = z.infer<typeof adminUpdateRoleBodySchema>;

/** Request body for POST /auth/google (create/find user from OAuth) */
export const authGoogleRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  image: z.string().optional(),
});
export type AuthGoogleRequest = z.infer<typeof authGoogleRequestSchema>;

/** Request body for POST /profiles/producer/apply */
export const profileProducerApplySchema = z.object({
  displayName: z.string().min(1, 'displayName requerido'),
  legalName: z.string().optional(),
  slug: z.string().optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(), // kept for legacy
  longDescription: z.string().optional(),
  primaryPhone: z.string().optional(),
  primaryEmail: z.string().email().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});
export type ProfileProducerApplyInput = z.infer<typeof profileProducerApplySchema>;

/** Request body for POST /profiles/gastro/apply */
export const profileGastroApplySchema = z.object({
  displayName: z.string().min(1, 'displayName requerido'),
  legalName: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  contactPhone: z.string().optional(),
});
export type ProfileGastroApplyInput = z.infer<typeof profileGastroApplySchema>;

/** Request body for POST /profiles/hotel/apply */
export const profileHotelApplySchema = z.object({
  displayName: z.string().min(1, 'displayName requerido'),
  legalName: z.string().optional(),
  description: z.string().max(5000).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  starCategory: z.number().int().min(1).max(5).optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.union([z.string().email(), z.literal('')]).optional(),
  websiteUrl: z
    .string()
    .min(1, 'Sitio web requerido')
    .max(2048)
    .refine((s) => /^https?:\/\//i.test(s.trim()), {
      message: 'La URL del sitio debe empezar con http:// o https://',
    }),
  bookingUrl: z
    .string()
    .max(2048)
    .optional()
    .refine((s) => !s?.trim() || /^https?:\/\//i.test(s.trim()), {
      message: 'La URL de reservas debe empezar con http:// o https://',
    }),
  socialLinks: z
    .object({
      instagram: z.string().max(500).optional(),
      facebook: z.string().max(500).optional(),
      tripadvisor: z.string().max(500).optional(),
      other: z.string().max(500).optional(),
    })
    .optional(),
});
export type ProfileHotelApplyInput = z.infer<typeof profileHotelApplySchema>;

/** Request body for POST /profiles/referrer/apply */
export const profileReferrerApplySchema = z.object({
  displayName: z.string().min(1, 'displayName requerido'),
  bio: z.string().max(500).optional(),
  longBio: z.string().max(5000).optional(),
  avatarUrl: z.string().max(2048).optional(),
  city: z.string().max(120).optional(),
  region: z.string().max(120).optional(),
  publicVisibility: z.boolean().optional(),
});
export type ProfileReferrerApplyInput = z.infer<typeof profileReferrerApplySchema>;

/** Request body for POST /auth/apply-role */
export const authApplyRoleRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  firstName: z.string().min(1, 'Nombre requerido'),
  lastName: z.string().min(1, 'Apellido requerido'),
  phone: z.string().optional(),
  businessName: z.string().optional(),
  role: z.enum(['PRODUCER_OWNER', 'GASTRO_OWNER', 'HOTEL_OWNER']),
  tenantId: z.string().optional(),
});
export type AuthApplyRoleRequest = z.infer<typeof authApplyRoleRequestSchema>;
