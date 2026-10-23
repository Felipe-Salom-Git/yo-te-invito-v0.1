import { z } from 'zod';
import { GASTRO_DISCOUNT_SETTLEMENT_BILLABILITIES } from '../gastro-courtesy-accounting';
import { moneyCentsStringSchema } from '../money/benefit-money';
import { benefitSettlementAllocationDtoSchema } from './benefit-settlements';

/**
 * G6 — Economic reporting for one GastroDiscount.
 * Precision semantics (conceptual): EXACT | DERIVED | SETTLEMENT_LEVEL | PARTNER_LEVEL | NOT_ATTRIBUTABLE
 * Never invent cashTransferredByDiscount or barterConsumedByDiscount.
 */

export const gastroDiscountEconomicAllocationRowSchema = benefitSettlementAllocationDtoSchema.extend({
  claimId: z.string().nullable(),
  validatedAt: z.string().datetime().nullable(),
  creditGeneratedCents: moneyCentsStringSchema.nullable().optional(),
});
export type GastroDiscountEconomicAllocationRow = z.infer<
  typeof gastroDiscountEconomicAllocationRowSchema
>;

/** G6.1 — Traceability result: discount → validations → allocations. */
export const gastroDiscountEconomicTraceabilityResponseSchema = z.object({
  discountId: z.string(),
  gastroProfileId: z.string(),
  validationCount: z.number().int().min(0),
  allocatedValidationCount: z.number().int().min(0),
  validationIds: z.array(z.string()),
  allocations: z.array(gastroDiscountEconomicAllocationRowSchema),
});
export type GastroDiscountEconomicTraceabilityResponse = z.infer<
  typeof gastroDiscountEconomicTraceabilityResponseSchema
>;

export const gastroDiscountEconomicSnapshotSegmentSchema = z.object({
  agreementId: z.string(),
  unitPriceCents: moneyCentsStringSchema,
  barterMultiplier: z.string(),
  currency: z.string(),
  usageCount: z.number().int().min(0),
  baseAmountCents: moneyCentsStringSchema,
  modes: z.array(z.enum(['CASH', 'BARTER'])),
});
export type GastroDiscountEconomicSnapshotSegment = z.infer<
  typeof gastroDiscountEconomicSnapshotSegmentSchema
>;

export const gastroDiscountEconomicSettlementContextSchema = z.object({
  settlementId: z.string(),
  periodKey: z.string(),
  status: z.string(),
  /** Allocations of THIS discount in the settlement (EXACT). */
  discountAllocationCount: z.number().int().min(0),
  discountCashBaseCents: moneyCentsStringSchema,
  discountBarterBaseCents: moneyCentsStringSchema,
  /** Settlement-wide cash figures — SETTLEMENT_LEVEL, not exclusive to this discount. */
  settlementCashDueCents: moneyCentsStringSchema,
  settlementCashReceivedCents: moneyCentsStringSchema,
  settlementCashOutstandingCents: moneyCentsStringSchema,
  settlementTotalAllocationCount: z.number().int().min(0),
  containsOtherDiscounts: z.boolean(),
});
export type GastroDiscountEconomicSettlementContext = z.infer<
  typeof gastroDiscountEconomicSettlementContextSchema
>;

export const gastroDiscountEconomicPartnerContextSchema = z.object({
  gastroProfileId: z.string(),
  currency: z.string(),
  /** Partner-level courtesy credit balance — PARTNER_LEVEL. */
  balanceAvailableCents: z.string(),
  creditGeneratedCents: moneyCentsStringSchema,
  creditConsumedCents: moneyCentsStringSchema,
});
export type GastroDiscountEconomicPartnerContext = z.infer<
  typeof gastroDiscountEconomicPartnerContextSchema
>;

export const gastroDiscountEconomicMetricsResponseSchema = z.object({
  discountId: z.string(),
  gastroProfileId: z.string(),
  currency: z.string(),
  /** Validations with claim on this discount (EXACT operational-economic boundary). */
  validatedUsageCount: z.number().int().min(0),
  /** Allocations linked via validationSource+validationId (EXACT). */
  allocatedUsageCount: z.number().int().min(0),
  /** G8.11 — funded courtesy validations are operational usage, NOT billable usage. */
  settlementBillability: z.enum(GASTRO_DISCOUNT_SETTLEMENT_BILLABILITIES),
  /** G8.11 — DEBIT_COURTESY of this courtesy campaign (EXACT via sourceCourtesyCampaignId). */
  courtesyFunding: z
    .object({
      campaignId: z.string(),
      ledgerEntryId: z.string(),
      imputedValueCents: moneyCentsStringSchema,
    })
    .nullable(),
  cash: z.object({
    usageCount: z.number().int().min(0),
    baseAmountCents: moneyCentsStringSchema,
  }),
  barter: z.object({
    usageCount: z.number().int().min(0),
    baseAmountCents: moneyCentsStringSchema,
    /** CREDIT_FROM_SETTLEMENT traced by sourceAllocationId (EXACT). */
    creditGeneratedCents: moneyCentsStringSchema,
  }),
  /** One segment per distinct agreement snapshot used in allocations. */
  snapshotSegments: z.array(gastroDiscountEconomicSnapshotSegmentSchema),
  settlements: z.array(gastroDiscountEconomicSettlementContextSchema),
  partner: gastroDiscountEconomicPartnerContextSchema.nullable(),
  allocations: z.array(gastroDiscountEconomicAllocationRowSchema),
});
export type GastroDiscountEconomicMetricsResponse = z.infer<
  typeof gastroDiscountEconomicMetricsResponseSchema
>;
