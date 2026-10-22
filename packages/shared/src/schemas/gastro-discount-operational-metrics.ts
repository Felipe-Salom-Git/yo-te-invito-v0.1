import { z } from 'zod';
import { gastroDiscountStatusSchema } from './gastro-discounts';
import { gastroDiscountClaimStatusSchema } from './gastro-courtesy-discounts';

/**
 * Canonical operational metrics for one GastroDiscount (G4.6+).
 * Scope: tenantId + gastroProfileId + discountId. No G6 settlement fields.
 */

export const gastroDiscountActivityDayBucketSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  claims: z.number().int().min(0),
  validations: z.number().int().min(0),
});
export type GastroDiscountActivityDayBucket = z.infer<
  typeof gastroDiscountActivityDayBucketSchema
>;

export const gastroDiscountRecentValidationSchema = z.object({
  id: z.string(),
  validatedAt: z.string().datetime(),
  claimId: z.string().nullable(),
  shortCode: z.string().nullable(),
  claimStatus: gastroDiscountClaimStatusSchema.nullable(),
});
export type GastroDiscountRecentValidation = z.infer<
  typeof gastroDiscountRecentValidationSchema
>;

export const gastroDiscountOperationalMetricsResponseSchema = z.object({
  discountId: z.string(),
  gastroProfileId: z.string(),
  timezone: z.string(),
  status: gastroDiscountStatusSchema,
  /** Total claims issued for this discount. */
  claims: z.number().int().min(0),
  /** Total QR validations recorded. */
  validations: z.number().int().min(0),
  /** Claims marked used / redeemed (operational usage). */
  usageCount: z.number().int().min(0),
  availableClaims: z.number().int().min(0),
  lastValidationAt: z.string().datetime().nullable(),
  hasQrToken: z.boolean(),
  qrGeneratedAt: z.string().datetime().nullable(),
  /** Sample of recent claim short codes (not a secret; operational lookup). */
  recentShortCodes: z.array(z.string()).max(10),
  activityByDay: z.array(gastroDiscountActivityDayBucketSchema),
  recentValidations: z.array(gastroDiscountRecentValidationSchema),
});
export type GastroDiscountOperationalMetricsResponse = z.infer<
  typeof gastroDiscountOperationalMetricsResponseSchema
>;
