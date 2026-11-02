import { z } from 'zod';
import { BENEFIT_SETTLEMENT_STATUSES, benefitSettlementPeriodKeySchema } from '../benefit-settlement';
import { moneyCentsStringSchema } from '../money/benefit-money';

/**
 * G10.D2 — validations of ONE GastroDiscount not yet allocated (ADMIN only).
 * Pricing status comes from the same eligibility engine used by `allocate` (never re-implemented).
 */
export const GASTRO_DISCOUNT_PENDING_PRICING_STATUSES = [
  'PRICED',
  'MISSING_AGREEMENT',
  'FUNDED_COURTESY',
] as const;
export type GastroDiscountPendingPricingStatus =
  (typeof GASTRO_DISCOUNT_PENDING_PRICING_STATUSES)[number];

export const GASTRO_DISCOUNT_PENDING_BLOCKED_REASONS = [
  'MISSING_AGREEMENT',
  'FUNDED_COURTESY',
  'SETTLEMENT_CLOSED',
] as const;
export type GastroDiscountPendingBlockedReason =
  (typeof GASTRO_DISCOUNT_PENDING_BLOCKED_REASONS)[number];

export const gastroDiscountPendingValidationSchema = z.object({
  validationId: z.string(),
  validatedAt: z.string().datetime(),
  /** Settlement period (AR calendar month) the validation belongs to. */
  periodKey: benefitSettlementPeriodKeySchema,
  pricingStatus: z.enum(GASTRO_DISCOUNT_PENDING_PRICING_STATUSES),
  agreementId: z.string().nullable(),
  unitPriceCents: moneyCentsStringSchema.nullable(),
  barterMultiplier: z.string().nullable(),
  currency: z.string().nullable(),
  claimShortCode: z.string().nullable(),
  claimEmail: z.string().nullable(),
  /** Existing settlement of the local for that period (null = generated on first allocation). */
  settlementId: z.string().nullable(),
  settlementStatus: z.enum(BENEFIT_SETTLEMENT_STATUSES).nullable(),
  allocatable: z.boolean(),
  blockedReason: z.enum(GASTRO_DISCOUNT_PENDING_BLOCKED_REASONS).nullable(),
});

export type GastroDiscountPendingValidation = z.infer<typeof gastroDiscountPendingValidationSchema>;

export const gastroDiscountPendingValidationsResponseSchema = z.object({
  discountId: z.string(),
  gastroProfileId: z.string(),
  /** false = credit-funded courtesy: operational usage only, never CASH / CANJE. */
  billable: z.boolean(),
  data: z.array(gastroDiscountPendingValidationSchema),
});

export type GastroDiscountPendingValidationsResponse = z.infer<
  typeof gastroDiscountPendingValidationsResponseSchema
>;
