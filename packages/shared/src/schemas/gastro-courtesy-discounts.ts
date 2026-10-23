import { z } from 'zod';
import { gastroDiscountQrPayloadV1Schema } from '../gastro-discount-qr';
import { moneyCentsStringSchema } from '../money/benefit-money';
import { gastroDiscountVisualTemplateResponseSchema } from './gastro-discount-visual-template.schema';

export const gastroDiscountClaimTypeSchema = z.enum(['PUBLIC_REQUEST', 'COURTESY']);
export type GastroDiscountClaimType = z.infer<typeof gastroDiscountClaimTypeSchema>;

export const gastroDiscountClaimSourceSchema = z.enum(['WEB', 'MANUAL_EMAIL', 'FOLLOWERS']);
export type GastroDiscountClaimSource = z.infer<typeof gastroDiscountClaimSourceSchema>;

export const gastroDiscountClaimStatusSchema = z.enum([
  'ACTIVE',
  'USED',
  'EXPIRED',
  'CANCELLED',
]);
export type GastroDiscountClaimStatus = z.infer<typeof gastroDiscountClaimStatusSchema>;

export const meGastroDiscountItemSchema = z.object({
  claimId: z.string(),
  accessToken: z.string(),
  type: gastroDiscountClaimTypeSchema,
  source: gastroDiscountClaimSourceSchema,
  status: gastroDiscountClaimStatusSchema,
  email: z.string().email(),
  qrPayload: gastroDiscountQrPayloadV1Schema,
  qrCode: z.string(),
  discountTitle: z.string().nullable(),
  discountDescription: z.string().nullable(),
  discountLabel: z.string().nullable(),
  locationId: z.string(),
  locationName: z.string(),
  locationSlug: z.string().nullable(),
  validTo: z.string().datetime().nullable(),
  validityMode: z.enum(['DATE_RANGE', 'WEEKLY_RECURRING']).optional(),
  validWeekday: z
    .enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'])
    .nullable()
    .optional(),
  availabilityLabel: z.string().nullable().optional(),
  usedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  emailSentAt: z.string().datetime().nullable(),
  visualTemplate: gastroDiscountVisualTemplateResponseSchema.nullable().optional(),
  discountType: z.enum(['PERCENT', 'FIXED']).optional(),
  discountValue: z.number().optional(),
  shortCode: z.string().max(16).nullable().optional(),
});

export const meGastroDiscountsResponseSchema = z.object({
  data: z.array(meGastroDiscountItemSchema),
});

export type MeGastroDiscountItem = z.infer<typeof meGastroDiscountItemSchema>;
export type MeGastroDiscountsResponse = z.infer<typeof meGastroDiscountsResponseSchema>;

/**
 * Query-string boolean. NEVER use `z.coerce.boolean()` for query params:
 * `Boolean("false") === true`, so `?sendToFollowers=false` would be read as `true`.
 */
export function parseQueryBoolean(value: unknown): unknown {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0' || normalized === '') return false;
  }
  return value;
}

export const gastroCourtesyRecipientsPreviewQuerySchema = z.object({
  gastroProfileId: z.string().min(1),
  manualEmails: z
    .preprocess(
      (val) => {
        if (typeof val === 'string') {
          return val
            .split(/[,;\s]+/)
            .map((s) => s.trim())
            .filter(Boolean);
        }
        if (Array.isArray(val)) return val;
        return undefined;
      },
      z.array(z.string().email()).max(200).optional(),
    )
    .optional(),
  sendToFollowers: z.preprocess(parseQueryBoolean, z.boolean()).optional(),
});

export const gastroCourtesyFundingSchema = z
  .object({
    source: z.literal('COURTESY_CREDIT'),
    imputedValueCents: moneyCentsStringSchema.refine((v) => {
      try {
        return BigInt(v) > 0n;
      } catch {
        return false;
      }
    }, 'imputedValueCents must be positive'),
  })
  .strict();

export type GastroCourtesyFunding = z.infer<typeof gastroCourtesyFundingSchema>;

export const gastroCourtesySendBodySchema = z.object({
  gastroProfileId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  discountLabel: z.string().min(1).max(120),
  validFrom: z.string().datetime().optional(),
  validTo: z.string().datetime(),
  manualEmails: z.array(z.string().email()).max(200).default([]),
  sendToFollowers: z.boolean().default(false),
  message: z.string().max(1000).optional(),
  funding: gastroCourtesyFundingSchema.optional(),
});

export const adminGastroCourtesyFundSendBodySchema = gastroCourtesySendBodySchema.extend({
  funding: gastroCourtesyFundingSchema,
});

export const gastroCourtesyRecipientsPreviewResponseSchema = z.object({
  manualCount: z.number().int(),
  followersCount: z.number().int(),
  duplicateCount: z.number().int(),
  totalUnique: z.number().int(),
  followerSample: z.array(
    z.object({
      email: z.string().email(),
      userId: z.string().nullable(),
      displayName: z.string().nullable(),
    }),
  ),
});

export const gastroCourtesySendResponseSchema = z.object({
  campaignId: z.string(),
  discountId: z.string(),
  requestedCount: z.number().int(),
  createdCount: z.number().int(),
  sentCount: z.number().int(),
  skippedCount: z.number().int(),
  failedCount: z.number().int(),
  failures: z.array(
    z.object({
      email: z.string().email(),
      reason: z.string(),
    }),
  ),
  emailConfigured: z.boolean(),
  /** G8.3: owner courtesies are born pending admin review (claims retained, nothing delivered). */
  discountStatus: z.enum(['PENDING_REVIEW', 'ACTIVE']).optional(),
  pendingApproval: z.boolean().optional(),
  fundedFromCourtesyCredit: z.boolean().optional(),
  ledgerEntryId: z.string().nullable().optional(),
  imputedValueCents: z.string().nullable().optional(),
});

/**
 * G8.9 / G8.10 — Per-campaign courtesy metrics (owner portal + ADMIN).
 * Same exclusive buckets as G8.8 (`computeGastroDiscountClaimMetrics`): used | cancelled |
 * retained | expired | available. `deliveredClaims` ⊂ available (emailed and still usable);
 * `pendingDeliveryClaims` = approved, usable and never emailed (what a redelivery would send).
 * A retained claim is never available, delivered nor pending delivery.
 * Audience counters describe the frozen recipient set (`claim.source` / `claim.userId`).
 */
export const gastroCourtesyCampaignMetricsSchema = z.object({
  recipientCount: z.number().int().min(0),
  manualRecipientCount: z.number().int().min(0),
  followerRecipientCount: z.number().int().min(0),
  registeredRecipientCount: z.number().int().min(0),
  retainedClaims: z.number().int().min(0),
  availableClaims: z.number().int().min(0),
  deliveredClaims: z.number().int().min(0),
  pendingDeliveryClaims: z.number().int().min(0),
  usedClaims: z.number().int().min(0),
  cancelledClaims: z.number().int().min(0),
  expiredClaims: z.number().int().min(0),
});
export type GastroCourtesyCampaignMetrics = z.infer<typeof gastroCourtesyCampaignMetricsSchema>;

export type GastroCourtesyRecipientsPreviewQuery = z.infer<
  typeof gastroCourtesyRecipientsPreviewQuerySchema
>;
export type GastroCourtesySendBody = z.infer<typeof gastroCourtesySendBodySchema>;
export type AdminGastroCourtesyFundSendBody = z.infer<typeof adminGastroCourtesyFundSendBodySchema>;
export type GastroCourtesyRecipientsPreviewResponse = z.infer<
  typeof gastroCourtesyRecipientsPreviewResponseSchema
>;
export type GastroCourtesySendResponse = z.infer<typeof gastroCourtesySendResponseSchema>;
