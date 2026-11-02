import { z } from 'zod';
import {
  BENEFIT_AGREEMENT_SCOPES,
  BENEFIT_VERTICALS,
  assertBenefitPartnerXor,
  isNewBenefitAgreementScopeValid,
} from '../benefit-commercial-agreements';
import {
  barterMultiplierInputSchema,
  benefitUnitPriceCentsInputSchema,
  moneyCentsStringSchema,
} from '../money/benefit-money';

const calendarDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const benefitVerticalSchema = z.enum(BENEFIT_VERTICALS);
export const benefitAgreementScopeSchema = z.enum(BENEFIT_AGREEMENT_SCOPES);

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

/**
 * G10 (D-G10-1/10): a new GASTRO agreement is always discount-scoped
 * (gastroProfileId + gastroDiscountId); legacy profile-scoped rows can no longer be created.
 */
export const createBenefitCommercialAgreementBodySchema = partnerFieldsBaseSchema
  .extend({
    gastroDiscountId: z.string().min(1).optional(),
    unitPriceCents: benefitUnitPriceCentsInputSchema,
    barterMultiplier: barterMultiplierInputSchema,
    currency: z.literal('ARS').default('ARS'),
    validFrom: calendarDateSchema,
    /** G10.B — optional end date (inclusive); omitted = open agreement (previous behaviour). */
    validTo: calendarDateSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.validTo && val.validTo < val.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validTo cannot be before validFrom',
        path: ['validTo'],
      });
    }
    if (!isNewBenefitAgreementScopeValid(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'GASTRO requires gastroProfileId + gastroDiscountId; ACTIVITY requires excursionOperatorId only',
        path: ['vertical'],
      });
    }
  });

export type CreateBenefitCommercialAgreementBody = z.infer<
  typeof createBenefitCommercialAgreementBodySchema
>;

/**
 * G10.B (D-G10-4) — terms of the discount's first contract, created in the SAME transaction as an
 * ADMIN-created ACTIVE discount (on-behalf or non-funded courtesy). Scope comes from the discount.
 */
export const gastroDiscountAgreementTermsSchema = z
  .object({
    unitPriceCents: benefitUnitPriceCentsInputSchema,
    barterMultiplier: barterMultiplierInputSchema,
    currency: z.literal('ARS').default('ARS'),
    validFrom: calendarDateSchema,
    validTo: calendarDateSchema.optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    if (val.validTo && val.validTo < val.validFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'validTo cannot be before validFrom',
        path: ['validTo'],
      });
    }
  });

export type GastroDiscountAgreementTerms = z.infer<typeof gastroDiscountAgreementTermsSchema>;

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
  gastroDiscountId: z.string().min(1).optional(),
  excursionOperatorId: z.string().min(1).optional(),
  scope: benefitAgreementScopeSchema.optional(),
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

/** G10 — history of one discount: discount-scoped agreements + legacy rows used by its allocations. */
export const benefitCommercialAgreementDiscountHistoryQuerySchema = z
  .object({
    gastroDiscountId: z.string().min(1),
  })
  .strict();

export type BenefitCommercialAgreementDiscountHistoryQuery = z.infer<
  typeof benefitCommercialAgreementDiscountHistoryQuerySchema
>;

/**
 * Resolve agreement vigente on a calendar date (default: today AR).
 * GASTRO + gastroDiscountId → DISCOUNT scope (the only scope used for pricing).
 * GASTRO + gastroProfileId only → PROFILE_LEGACY (transitional approval gate until G10.B; read-only).
 * ACTIVITY + excursionOperatorId → OPERATOR.
 */
export const benefitCommercialAgreementResolveQuerySchema = partnerFieldsBaseSchema
  .extend({
    gastroDiscountId: z.string().min(1).optional(),
    onDate: calendarDateSchema.optional(),
  })
  .superRefine((val, ctx) => {
    const ok =
      val.vertical === 'GASTRO'
        ? Boolean(val.gastroDiscountId || val.gastroProfileId) && !val.excursionOperatorId
        : Boolean(val.excursionOperatorId) && !val.gastroProfileId && !val.gastroDiscountId;
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'GASTRO requires gastroDiscountId (or legacy gastroProfileId); ACTIVITY requires excursionOperatorId only',
        path: ['vertical'],
      });
    }
  });

export type BenefitCommercialAgreementResolveQuery = z.infer<
  typeof benefitCommercialAgreementResolveQuerySchema
>;

export const benefitCommercialAgreementDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  vertical: benefitVerticalSchema,
  gastroProfileId: z.string().nullable(),
  gastroDiscountId: z.string().nullable(),
  excursionOperatorId: z.string().nullable(),
  /** G10 — derived: DISCOUNT | PROFILE_LEGACY (read-only) | OPERATOR. */
  scope: benefitAgreementScopeSchema,
  /** Backfill lineage (legacy profile agreement this copy came from). */
  derivedFromAgreementId: z.string().nullable(),
  partnerDisplayName: z.string().nullable(),
  discountTitle: z.string().nullable(),
  /** G10.B — lifecycle status of the discount (DISCOUNT scope only). */
  discountStatus: z.string().nullable(),
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

export const benefitCommercialAgreementResolveResponseSchema = z.object({
  vertical: benefitVerticalSchema,
  gastroProfileId: z.string().nullable(),
  gastroDiscountId: z.string().nullable(),
  excursionOperatorId: z.string().nullable(),
  onDate: calendarDateSchema,
  agreement: benefitCommercialAgreementDtoSchema.nullable(),
});

export type BenefitCommercialAgreementResolveResponse = z.infer<
  typeof benefitCommercialAgreementResolveResponseSchema
>;

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

export const benefitCommercialAgreementLegacyUsageSchema = z.object({
  agreement: benefitCommercialAgreementDtoSchema,
  /** Allocations of this discount priced with the legacy profile agreement (EXACT). */
  usageCount: z.number().int().min(0),
});

export const benefitCommercialAgreementDiscountHistoryResponseSchema = z.object({
  gastroDiscountId: z.string(),
  gastroProfileId: z.string().nullable(),
  discountTitle: z.string().nullable(),
  /** G10.B — discount lifecycle status (alerts: ACTIVE/APPROVED without CURRENT). */
  discountStatus: z.string(),
  /** G10.B — false = courtesy funded with barter credit (D1): no contract required. */
  billable: z.boolean(),
  current: benefitCommercialAgreementDtoSchema.nullable(),
  history: z.array(benefitCommercialAgreementDtoSchema),
  legacyUsed: z.array(benefitCommercialAgreementLegacyUsageSchema),
});

export type BenefitCommercialAgreementDiscountHistoryResponse = z.infer<
  typeof benefitCommercialAgreementDiscountHistoryResponseSchema
>;