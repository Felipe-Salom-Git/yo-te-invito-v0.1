import { z } from 'zod';
import {
  BENEFIT_VERTICALS,
  assertBenefitPartnerXor,
} from '../benefit-commercial-agreements';
import {
  barterMultiplierInputSchema,
  benefitUnitPriceCentsInputSchema,
  moneyCentsStringSchema,
} from '../money/benefit-money';

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const benefitVerticalSchema = z.enum(BENEFIT_VERTICALS);

const partnerFieldsBaseSchema = z
  .object({
    vertical: benefitVerticalSchema,
    gastroProfileId: z.string().min(1).optional(),
    excursionOperatorId: z.string().min(1).optional(),
  })
  .strict();

function refinePartnerXor<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((val, ctx) => {
    const data = val as z.infer<typeof partnerFieldsBaseSchema>;
    if (!assertBenefitPartnerXor(data.vertical, data.gastroProfileId, data.excursionOperatorId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'GASTRO requires gastroProfileId only; ACTIVITY requires excursionOperatorId only',
        path: ['vertical'],
      });
    }
  });
}

export const createBenefitCommercialAgreementBodySchema = refinePartnerXor(
  partnerFieldsBaseSchema.extend({
    unitPriceCents: benefitUnitPriceCentsInputSchema,
    barterMultiplier: barterMultiplierInputSchema,
    currency: z.literal('ARS').default('ARS'),
    validFrom: calendarDateSchema,
    notes: z.string().trim().max(2000).optional(),
  }),
);

export type CreateBenefitCommercialAgreementBody = z.infer<
  typeof createBenefitCommercialAgreementBodySchema
>;

export const closeBenefitCommercialAgreementBodySchema = z
  .object({
    validTo: calendarDateSchema,
  })
  .strict();

export type CloseBenefitCommercialAgreementBody = z.infer<
  typeof closeBenefitCommercialAgreementBodySchema
>;

export const replaceBenefitCommercialAgreementBodySchema = z
  .object({
    effectiveFrom: calendarDateSchema,
    unitPriceCents: benefitUnitPriceCentsInputSchema,
    barterMultiplier: barterMultiplierInputSchema,
    currency: z.literal('ARS').default('ARS'),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict();

export type ReplaceBenefitCommercialAgreementBody = z.infer<
  typeof replaceBenefitCommercialAgreementBodySchema
>;

export const updateBenefitCommercialAgreementNotesBodySchema = z
  .object({
    notes: z.string().trim().max(2000).nullable(),
  })
  .strict();

export type UpdateBenefitCommercialAgreementNotesBody = z.infer<
  typeof updateBenefitCommercialAgreementNotesBodySchema
>;

export const benefitCommercialAgreementsListQuerySchema = z.object({
  vertical: benefitVerticalSchema.optional(),
  gastroProfileId: z.string().min(1).optional(),
  excursionOperatorId: z.string().min(1).optional(),
  vigency: z.enum(['CURRENT', 'PAST', 'FUTURE', 'ALL']).default('ALL'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type BenefitCommercialAgreementsListQuery = z.infer<
  typeof benefitCommercialAgreementsListQuerySchema
>;

export const benefitCommercialAgreementPartnerHistoryQuerySchema = refinePartnerXor(
  partnerFieldsBaseSchema,
);

export type BenefitCommercialAgreementPartnerHistoryQuery = z.infer<
  typeof benefitCommercialAgreementPartnerHistoryQuerySchema
>;

export const benefitCommercialAgreementDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  vertical: benefitVerticalSchema,
  gastroProfileId: z.string().nullable(),
  excursionOperatorId: z.string().nullable(),
  partnerDisplayName: z.string().nullable(),
  unitPriceCents: moneyCentsStringSchema,
  barterMultiplier: z.string(),
  currency: z.string(),
  validFrom: calendarDateSchema,
  validTo: calendarDateSchema.nullable(),
  vigency: z.enum(['FUTURE', 'CURRENT', 'PAST']),
  isOpen: z.boolean(),
  notes: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type BenefitCommercialAgreementDto = z.infer<typeof benefitCommercialAgreementDtoSchema>;

export const benefitCommercialAgreementsListResponseSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  data: z.array(benefitCommercialAgreementDtoSchema),
});

export type BenefitCommercialAgreementsListResponse = z.infer<
  typeof benefitCommercialAgreementsListResponseSchema
>;

export const benefitCommercialAgreementPartnerHistoryResponseSchema = z.object({
  vertical: benefitVerticalSchema,
  gastroProfileId: z.string().nullable(),
  excursionOperatorId: z.string().nullable(),
  partnerDisplayName: z.string().nullable(),
  current: benefitCommercialAgreementDtoSchema.nullable(),
  history: z.array(benefitCommercialAgreementDtoSchema),
});

export type BenefitCommercialAgreementPartnerHistoryResponse = z.infer<
  typeof benefitCommercialAgreementPartnerHistoryResponseSchema
>;
