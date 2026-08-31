import { z } from 'zod';

export const MARKETING_PREFERENCE_SOURCES = ['ACCOUNT', 'UNSUBSCRIBE', 'ADMIN'] as const;
export type MarketingPreferenceSource = (typeof MARKETING_PREFERENCE_SOURCES)[number];

export const marketingUnsubscribeTokenSchema = z
  .string()
  .regex(/^[a-f0-9]{64}$/, 'invalid unsubscribe token');

export const patchMeMarketingPreferencesBodySchema = z
  .object({
    emailOptIn: z.boolean().optional(),
    whatsappOptIn: z.boolean().optional(),
  })
  .strict()
  .refine((body) => body.emailOptIn !== undefined || body.whatsappOptIn !== undefined, {
    message: 'At least one preference is required',
  });

export type PatchMeMarketingPreferencesBody = z.infer<
  typeof patchMeMarketingPreferencesBodySchema
>;

export const meMarketingPreferencesSchema = z.object({
  emailOptIn: z.boolean(),
  emailOptInAt: z.string().datetime().nullable(),
  emailOptOutAt: z.string().datetime().nullable(),
  whatsappOptIn: z.boolean(),
  whatsappOptInAt: z.string().datetime().nullable(),
  whatsappOptOutAt: z.string().datetime().nullable(),
  whatsappAvailable: z.boolean(),
  source: z.enum(MARKETING_PREFERENCE_SOURCES).nullable(),
});

export type MeMarketingPreferences = z.infer<typeof meMarketingPreferencesSchema>;

export const publicMarketingUnsubscribeQuerySchema = z.object({
  token: marketingUnsubscribeTokenSchema,
});

export type PublicMarketingUnsubscribeQuery = z.infer<
  typeof publicMarketingUnsubscribeQuerySchema
>;

export const publicMarketingUnsubscribeResponseSchema = z.object({
  ok: z.literal(true),
  emailOptIn: z.literal(false),
  alreadyUnsubscribed: z.boolean(),
});

export type PublicMarketingUnsubscribeResponse = z.infer<
  typeof publicMarketingUnsubscribeResponseSchema
>;

export const EMAIL_CAMPAIGN_SKIP_REASONS = [
  'NO_PREFERENCE',
  'OPT_OUT',
  'NO_EMAIL',
  'UNVERIFIED_EMAIL',
  'INACTIVE_USER',
  'SCANNER_ROLE',
  'TENANT_MISMATCH',
  'USER_GONE',
] as const;

export type EmailCampaignSkipReason = (typeof EMAIL_CAMPAIGN_SKIP_REASONS)[number];

export type EmailCampaignEligibilityInput = {
  emailOptIn: boolean | null | undefined;
  email: string | null | undefined;
  emailVerified: Date | string | null | undefined;
  status: string | null | undefined;
  role: string | null | undefined;
  userTenantId: string | null | undefined;
  campaignTenantId: string;
};

export function isEmailCampaignEligible(
  input: EmailCampaignEligibilityInput,
): { ok: true } | { ok: false; reason: EmailCampaignSkipReason } {
  if (!input.userTenantId || input.userTenantId !== input.campaignTenantId) {
    return { ok: false, reason: 'TENANT_MISMATCH' };
  }
  if (input.status !== 'ACTIVE') {
    return { ok: false, reason: 'INACTIVE_USER' };
  }
  if (input.role === 'SCANNER') {
    return { ok: false, reason: 'SCANNER_ROLE' };
  }
  if (!input.email?.trim()) {
    return { ok: false, reason: 'NO_EMAIL' };
  }
  if (input.emailVerified == null || input.emailVerified === '') {
    return { ok: false, reason: 'UNVERIFIED_EMAIL' };
  }
  if (input.emailOptIn == null) {
    return { ok: false, reason: 'NO_PREFERENCE' };
  }
  if (input.emailOptIn !== true) {
    return { ok: false, reason: 'OPT_OUT' };
  }
  return { ok: true };
}

export function isMarketingUnsubscribeTokenShape(token: string | null | undefined): boolean {
  return marketingUnsubscribeTokenSchema.safeParse(token).success;
}

export function emptyMeMarketingPreferences(whatsappAvailable: boolean): MeMarketingPreferences {
  return {
    emailOptIn: false,
    emailOptInAt: null,
    emailOptOutAt: null,
    whatsappOptIn: false,
    whatsappOptInAt: null,
    whatsappOptOutAt: null,
    whatsappAvailable,
    source: null,
  };
}

/** Transactional EMAIL (claim QR, verify) does not read marketing opt-in. */
export function isTransactionalEmailIndependentOfMarketingOptIn(): true {
  return true;
}
