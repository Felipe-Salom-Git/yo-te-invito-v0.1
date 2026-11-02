import { z } from 'zod';
import {
  BENEFIT_SETTLEMENT_ALLOCATION_MODES,
  BENEFIT_SETTLEMENT_STATUSES,
  BENEFIT_VALIDATION_SOURCES,
  assertBenefitSettlementPartnerXor,
  benefitSettlementPeriodKeySchema,
} from '../benefit-settlement';
import { benefitVerticalSchema } from './benefit-commercial-agreements';
import { moneyCentsStringSchema } from '../money/benefit-money';
import { safeExternalUrlSchema } from './external-links';
import { BENEFIT_CASH_COLLECTION_STATUSES } from '../benefit-settlement';
import { BENEFIT_TRANSFER_ATTRIBUTIONS } from '../benefit-settlement-discount-payments';

const partnerFieldsBaseSchema = z
  .object({
    vertical: benefitVerticalSchema,
    gastroProfileId: z.string().min(1).optional(),
    excursionOperatorId: z.string().min(1).optional(),
  })
  .strict();

function refineSettlementPartnerXor<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((val, ctx) => {
    const data = val as z.infer<typeof partnerFieldsBaseSchema>;
    if (!assertBenefitSettlementPartnerXor(data.vertical, data.gastroProfileId, data.excursionOperatorId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'GASTRO requires gastroProfileId only; ACTIVITY requires excursionOperatorId only',
        path: ['vertical'],
      });
    }
  });
}

export const generateBenefitSettlementBodySchema = refineSettlementPartnerXor(
  partnerFieldsBaseSchema.extend({
    periodKey: benefitSettlementPeriodKeySchema,
  }),
);

export type GenerateBenefitSettlementBody = z.infer<typeof generateBenefitSettlementBodySchema>;

/**
 * `count` = oldest-first (legacy); `validationIds` = explicit selection (G7.12.3). Exactly one.
 * Ids must be pending validations of the same settlement (partner + period) — checked server-side.
 */
export const allocateBenefitSettlementUsagesBodySchema = z
  .object({
    mode: z.enum(BENEFIT_SETTLEMENT_ALLOCATION_MODES),
    count: z.number().int().min(1).max(10_000).optional(),
    validationIds: z.array(z.string().min(1)).min(1).max(10_000).optional(),
    /**
     * G10.D2 — allocation isolation from a discount detail: every selected validation must belong
     * to this GastroDiscount (GASTRO only, explicit validationIds only).
     */
    gastroDiscountId: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if ((val.count == null) === (val.validationIds == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either count or validationIds',
        path: ['count'],
      });
    }
    if (val.gastroDiscountId != null && val.validationIds == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'gastroDiscountId requires explicit validationIds',
        path: ['gastroDiscountId'],
      });
    }
  });

export type AllocateBenefitSettlementUsagesBody = z.infer<
  typeof allocateBenefitSettlementUsagesBodySchema
>;

export const benefitSettlementsListQuerySchema = z.object({
  vertical: benefitVerticalSchema.optional(),
  gastroProfileId: z.string().min(1).optional(),
  excursionOperatorId: z.string().min(1).optional(),
  periodKey: benefitSettlementPeriodKeySchema.optional(),
  status: z.enum(BENEFIT_SETTLEMENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type BenefitSettlementsListQuery = z.infer<typeof benefitSettlementsListQuerySchema>;

export const benefitSettlementMissingAgreementSchema = z.object({
  validationSource: z.enum(BENEFIT_VALIDATION_SOURCES),
  validationId: z.string(),
  validatedAt: z.string().datetime(),
  /** G10 — GastroDiscount.id (GASTRO) whose own agreement is missing; null for ACTIVITY. */
  benefitId: z.string().nullable().optional(),
});

export type BenefitSettlementMissingAgreement = z.infer<
  typeof benefitSettlementMissingAgreementSchema
>;

/** G10 (D-G10-6) — billable usages without agreement, grouped by discount. */
export const benefitSettlementMissingAgreementGroupSchema = z.object({
  benefitId: z.string().nullable(),
  usageCount: z.number().int().min(0),
});

export type BenefitSettlementMissingAgreementGroup = z.infer<
  typeof benefitSettlementMissingAgreementGroupSchema
>;

export const benefitSettlementSummarySchema = z.object({
  eligibleUsageCount: z.number().int(),
  allocatedCashCount: z.number().int(),
  allocatedBarterCount: z.number().int(),
  pendingUsageCount: z.number().int(),
  eligibleBaseAmountCents: moneyCentsStringSchema,
  cashBaseAmountCents: moneyCentsStringSchema,
  barterBaseAmountCents: moneyCentsStringSchema,
  pendingBaseAmountCents: moneyCentsStringSchema,
  cashDueCents: moneyCentsStringSchema,
  cashReceivedCents: moneyCentsStringSchema,
  cashOutstandingCents: moneyCentsStringSchema,
  cashCollectionStatus: z.enum(BENEFIT_CASH_COLLECTION_STATUSES),
  transferCount: z.number().int(),
  barterCreditPreviewCents: moneyCentsStringSchema.optional(),
  barterCreditExpectedCents: moneyCentsStringSchema.optional(),
  barterCreditMaterializedCents: moneyCentsStringSchema.optional(),
  /** G8.11 — credit-funded courtesy validations in the period (operational usage, NOT billable). */
  fundedCourtesyUsageCount: z.number().int().min(0).optional(),
  /** G10 — billable usages without applicable agreement (block close only). */
  missingAgreementUsageCount: z.number().int().min(0).optional(),
  missingAgreementsByBenefit: z.array(benefitSettlementMissingAgreementGroupSchema).optional(),
});

export type BenefitSettlementSummary = z.infer<typeof benefitSettlementSummarySchema>;

export const benefitSettlementAllocationDtoSchema = z.object({
  id: z.string(),
  settlementId: z.string(),
  validationSource: z.enum(BENEFIT_VALIDATION_SOURCES),
  validationId: z.string(),
  mode: z.enum(BENEFIT_SETTLEMENT_ALLOCATION_MODES),
  agreementId: z.string(),
  unitPriceCents: moneyCentsStringSchema,
  barterMultiplier: z.string(),
  baseAmountCents: moneyCentsStringSchema,
  currency: z.string(),
  allocatedAt: z.string().datetime(),
  allocatedByUserId: z.string().nullable(),
});

export type BenefitSettlementAllocationDto = z.infer<typeof benefitSettlementAllocationDtoSchema>;

export const benefitSettlementDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  vertical: benefitVerticalSchema,
  gastroProfileId: z.string().nullable(),
  excursionOperatorId: z.string().nullable(),
  partnerDisplayName: z.string().nullable(),
  periodKey: benefitSettlementPeriodKeySchema,
  status: z.enum(BENEFIT_SETTLEMENT_STATUSES),
  summary: benefitSettlementSummarySchema,
  createdByUserId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
});

export type BenefitSettlementDto = z.infer<typeof benefitSettlementDtoSchema>;

export const benefitSettlementsListResponseSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  data: z.array(benefitSettlementDtoSchema),
});

export type BenefitSettlementsListResponse = z.infer<typeof benefitSettlementsListResponseSchema>;

/** G7.12.2 — pending (eligible, not yet allocated) validation of one settlement. EXACT level. */
export const benefitSettlementPendingValidationSchema = z.object({
  validationSource: z.enum(BENEFIT_VALIDATION_SOURCES),
  validationId: z.string(),
  validatedAt: z.string().datetime(),
  /** GastroDiscount.id / ActivityCoupon.id — grouping only, never settlement owner. */
  benefitId: z.string(),
  benefitTitle: z.string(),
  shortCode: z.string().nullable(),
  agreementId: z.string(),
  unitPriceCents: moneyCentsStringSchema,
  barterMultiplier: z.string(),
  currency: z.string(),
});

export type BenefitSettlementPendingValidation = z.infer<
  typeof benefitSettlementPendingValidationSchema
>;

export const benefitSettlementPendingValidationsResponseSchema = z.object({
  settlementId: z.string(),
  data: z.array(benefitSettlementPendingValidationSchema),
  /** Eligible validations without applicable agreement (not allocatable until fixed). */
  missingAgreementCount: z.number().int().min(0),
  /** G10 — same validations grouped by discount (each discount needs its own agreement). */
  missingAgreementsByBenefit: z.array(benefitSettlementMissingAgreementGroupSchema).optional(),
  /** G8.11 — validations of credit-funded courtesies in the period: operational, NOT billable. */
  fundedCourtesyExcludedCount: z.number().int().min(0),
});

export type BenefitSettlementPendingValidationsResponse = z.infer<
  typeof benefitSettlementPendingValidationsResponseSchema
>;

export const allocateBenefitSettlementResponseSchema = z.object({
  settlement: benefitSettlementDtoSchema,
  allocations: z.array(benefitSettlementAllocationDtoSchema),
});

export type AllocateBenefitSettlementResponse = z.infer<
  typeof allocateBenefitSettlementResponseSchema
>;

export const registerBenefitSettlementTransferBodySchema = z
  .object({
    amountCents: moneyCentsStringSchema.refine((v) => BigInt(v) > 0n, 'amount must be positive'),
    currency: z.literal('ARS').default('ARS'),
    transferredAt: z.string().datetime(),
    reference: z.string().trim().max(120).optional(),
    notes: z.string().trim().max(2000).optional(),
    /** Link to proof (bank receipt) hosted by ADMIN — no file stored in DB. */
    proofUrl: safeExternalUrlSchema.optional(),
    /**
     * G10.D (D-G10-7) — GastroDiscount paid by this transfer. Required for GASTRO settlements,
     * rejected for ACTIVITY (the vertical lives in the settlement: checked server-side).
     */
    gastroDiscountId: z.string().trim().min(1).max(64).optional(),
  })
  .strict();

export type RegisterBenefitSettlementTransferBody = z.infer<
  typeof registerBenefitSettlementTransferBodySchema
>;

export const reverseBenefitSettlementTransferBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export type ReverseBenefitSettlementTransferBody = z.infer<
  typeof reverseBenefitSettlementTransferBodySchema
>;

export const benefitSettlementTransferDtoSchema = z.object({
  id: z.string(),
  settlementId: z.string(),
  amountCents: moneyCentsStringSchema,
  currency: z.string(),
  transferredAt: z.string().datetime(),
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  proofUrl: z.string().nullable(),
  registeredByUserId: z.string().nullable(),
  createdAt: z.string().datetime(),
  reversedAt: z.string().datetime().nullable(),
  reversedByUserId: z.string().nullable(),
  reversalReason: z.string().nullable(),
  isActive: z.boolean(),
  /** G10.D — null = legacy SETTLEMENT_LEVEL transfer (never attributed after the fact). */
  gastroDiscountId: z.string().nullable(),
  attribution: z.enum(BENEFIT_TRANSFER_ATTRIBUTIONS),
});

export type BenefitSettlementTransferDto = z.infer<typeof benefitSettlementTransferDtoSchema>;

export const benefitSettlementTransfersListResponseSchema = z.object({
  data: z.array(benefitSettlementTransferDtoSchema),
});

export type BenefitSettlementTransfersListResponse = z.infer<
  typeof benefitSettlementTransfersListResponseSchema
>;
