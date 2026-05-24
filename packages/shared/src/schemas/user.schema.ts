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

export {
  registrationProfileTypeSchema,
  type RegistrationProfileType,
  validateAuthRegisterProfilePayload,
} from './profile-onboarding';

import { signupLegalAcceptanceSchema } from './me-legal';
import {
  registrationProfileTypeSchema,
  validateAuthRegisterProfilePayload,
} from './profile-onboarding';

/** Request body for POST /auth/register */
export const authRegisterRequestSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    firstName: z.string().min(1, 'Nombre requerido'),
    lastName: z.string().min(1, 'Apellido requerido'),
    city: z.string().max(120).optional(),
    tenantId: z.string().optional(),
    profileType: registrationProfileTypeSchema.optional().default('USER'),
    profileData: z.unknown().optional(),
    /** When present, SIGNUP acceptances are persisted in the same transaction as user creation. */
    signupLegalAcceptance: signupLegalAcceptanceSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const result = validateAuthRegisterProfilePayload(data.profileType, data.profileData);
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({
          ...issue,
          path: ['profileData', ...issue.path],
        });
      }
    }
    if (data.profileType !== 'USER' && data.profileData == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'profileData es requerido para el tipo de perfil seleccionado',
        path: ['profileData'],
      });
    }
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

/** @deprecated Import from `./admin-users` — re-exported for backward compatibility */
export {
  adminUsersListQuerySchema,
  type AdminUsersListQuery,
  adminUpdateRoleBodySchema,
  type AdminUpdateRoleBody,
} from './admin-users';

/** Admin: create referrer body */
export const adminCreateReferrerBodySchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(6).optional(),
});
export type AdminCreateReferrerBody = z.infer<typeof adminCreateReferrerBodySchema>;

/** Request body for POST /auth/google (create/find user from OAuth) */
export const authGoogleRequestSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  image: z.string().optional(),
});
export type AuthGoogleRequest = z.infer<typeof authGoogleRequestSchema>;

/** @deprecated Use names from `profile-onboarding.ts` — aliases kept for importers */
export {
  producerProfileApplySchema as profileProducerApplySchema,
  gastroProfileApplySchema as profileGastroApplySchema,
  hotelProfileApplySchema as profileHotelApplySchema,
  referrerProfileApplySchema as profileReferrerApplySchema,
  type ProducerProfileApplyInput as ProfileProducerApplyInput,
  type GastroProfileApplyInput as ProfileGastroApplyInput,
  type HotelProfileApplyInput as ProfileHotelApplyInput,
  type ReferrerProfileApplyInput as ProfileReferrerApplyInput,
} from './profile-onboarding';

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
