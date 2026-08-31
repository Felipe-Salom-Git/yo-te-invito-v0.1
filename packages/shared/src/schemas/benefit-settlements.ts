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

export const allocateBenefitSettlementUsagesBodySchema = z
  .object({
    mode: z.enum(BENEFIT_SETTLEMENT_ALLOCATION_MODES),
    count: z.number().int().min(1).max(10_000),
  })
  .strict();

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
});

export type BenefitSettlementMissingAgreement = z.infer<
  typeof benefitSettlementMissingAgreementSchema
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

export const allocateBenefitSettlementResponseSchema = z.object({
  settlement: benefitSettlementDtoSchema,
  allocations: z.array(benefitSettlementAllocationDtoSchema),
});

export type AllocateBenefitSettlementResponse = z.infer<
  typeof allocateBenefitSettlementResponseSchema
>;
