import { z } from 'zod';
import { gastroDiscountQrPayloadV1Schema } from '../gastro-discount-qr';

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
  usedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  emailSentAt: z.string().datetime().nullable(),
});

export const meGastroDiscountsResponseSchema = z.object({
  data: z.array(meGastroDiscountItemSchema),
});

export type MeGastroDiscountItem = z.infer<typeof meGastroDiscountItemSchema>;
export type MeGastroDiscountsResponse = z.infer<typeof meGastroDiscountsResponseSchema>;

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
  sendToFollowers: z.coerce.boolean().optional(),
});

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
  sentCount: z.number().int(),
  skippedCount: z.number().int(),
});

export type GastroCourtesyRecipientsPreviewQuery = z.infer<
  typeof gastroCourtesyRecipientsPreviewQuerySchema
>;
export type GastroCourtesySendBody = z.infer<typeof gastroCourtesySendBodySchema>;
export type GastroCourtesyRecipientsPreviewResponse = z.infer<
  typeof gastroCourtesyRecipientsPreviewResponseSchema
>;
export type GastroCourtesySendResponse = z.infer<typeof gastroCourtesySendResponseSchema>;
