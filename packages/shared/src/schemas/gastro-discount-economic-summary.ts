import { z } from 'zod';
import { BENEFIT_CASH_COLLECTION_STATUSES } from '../benefit-settlement';
import { GASTRO_DISCOUNT_SETTLEMENT_BILLABILITIES } from '../gastro-courtesy-accounting';
import { GASTRO_DISCOUNT_CASH_REMAINING_PRECISIONS } from '../gastro-discount-economic-summary';
import { GASTRO_DISCOUNT_ECONOMIC_HISTORY_KINDS } from '../gastro-discount-economic-history';
import { moneyCentsStringSchema, signedMoneyCentsStringSchema } from '../money/benefit-money';
import { benefitCommercialAgreementDtoSchema } from './benefit-commercial-agreements';

/**
 * G10.C — `GastroDiscountEconomicSummary`: one canonical economic read of ONE discount.
 * EN: ADMIN receives the full variant; GASTRO receives the same figures parsed through the GASTRO
 *     schema, which strips notes, actors, proof URLs and internal metadata (Zod strips unknown keys).
 *     Precision is explicit: discount-level figures are EXACT; settlement figures SETTLEMENT_LEVEL;
 *     the local's credit balance PARTNER_LEVEL; legacy local agreements PARTNER_LEVEL_LEGACY.
 *     Barter credit consumed per discount is NOT_ATTRIBUTABLE and is never exposed.
 * ES: ADMIN recibe la variante completa; GASTRO las mismas cifras filtradas por su schema (sin notas,
 *     actores, comprobantes ni metadata interna). El crédito consumido por descuento no se expone.
 */

const cashRemainingPrecisionSchema = z.enum(GASTRO_DISCOUNT_CASH_REMAINING_PRECISIONS);

export const gastroDiscountEconomicDiscountSchema = z.object({
  id: z.string(),
  gastroProfileId: z.string().nullable(),
  title: z.string().nullable(),
  status: z.string(),
  visibility: z.enum(['PUBLIC', 'COURTESY_ONLY']),
  isCourtesy: z.boolean(),
  settlementBillability: z.enum(GASTRO_DISCOUNT_SETTLEMENT_BILLABILITIES),
});

/** Contract terms visible to GASTRO (subset of the agreement DTO: no notes, no actor). */
export const gastroDiscountEconomicAgreementTermsSchema = benefitCommercialAgreementDtoSchema.pick({
  id: true,
  scope: true,
  unitPriceCents: true,
  currency: true,
  barterMultiplier: true,
  validFrom: true,
  validTo: true,
  vigency: true,
  isOpen: true,
});
export type GastroDiscountEconomicAgreementTerms = z.infer<
  typeof gastroDiscountEconomicAgreementTermsSchema
>;

function agreementBlockSchema<T extends z.ZodTypeAny>(agreement: T) {
  return z.object({
    /** CURRENT discount-scoped contract (scope = DISCOUNT) — EXACT. */
    current: agreement.nullable(),
    /** Discount-scoped history — EXACT. */
    history: z.array(agreement),
    /** Legacy local contracts that actually priced allocations of THIS discount. */
    legacyUsed: z.array(
      z.object({
        agreement,
        usageCount: z.number().int().min(0),
        precision: z.literal('PARTNER_LEVEL_LEGACY'),
      }),
    ),
  });
}

export const gastroDiscountEconomicValidationsSchema = z.object({
  /** Validations with claim (settlement boundary; master-QR validations never bill). */
  total: z.number().int().min(0),
  billable: z.number().int().min(0),
  /** D1 — funded courtesy: operational usage, NOT billable. */
  fundedCourtesy: z.number().int().min(0),
  allocated: z.number().int().min(0),
  pending: z.number().int().min(0),
  pendingWithoutAgreement: z.number().int().min(0),
});

export const gastroDiscountEconomicCashSchema = z.object({
  usageCount: z.number().int().min(0),
  /** Σ baseAmountCents of CASH allocations of this discount — EXACT. */
  generatedCents: moneyCentsStringSchema,
  /** Σ active transfers with gastroDiscountId = discount — EXACT. */
  paidCents: moneyCentsStringSchema,
  /** generated − paid (never prorated). */
  remainingCents: moneyCentsStringSchema,
  remainingPrecision: cashRemainingPrecisionSchema,
  /** Active transfers WITHOUT discount in the settlements where this discount owes CASH — SETTLEMENT_LEVEL. */
  unattributedSettlementReceivedCents: moneyCentsStringSchema,
});

export const gastroDiscountEconomicBarterSchema = z.object({
  usageCount: z.number().int().min(0),
  baseCents: moneyCentsStringSchema,
  /** CREDIT_FROM_SETTLEMENT by sourceAllocationId (ledger, net of reversals) — EXACT. */
  creditGeneratedCents: moneyCentsStringSchema,
});

export const gastroDiscountEconomicSettlementLineSchema = z.object({
  settlementId: z.string(),
  periodKey: z.string(),
  status: z.string(),
  discountUsageCount: z.number().int().min(0),
  discountCashDueCents: moneyCentsStringSchema,
  discountCashPaidCents: moneyCentsStringSchema,
  discountCashRemainingCents: moneyCentsStringSchema,
  discountCollectionStatus: z.enum(BENEFIT_CASH_COLLECTION_STATUSES),
  discountBarterBaseCents: moneyCentsStringSchema,
  settlementCashDueCents: moneyCentsStringSchema,
  settlementCashReceivedCents: moneyCentsStringSchema,
  settlementCashOutstandingCents: moneyCentsStringSchema,
  unattributedReceivedCents: moneyCentsStringSchema,
  containsOtherDiscounts: z.boolean(),
  hasUnattributedTransfers: z.boolean(),
  remainingPrecision: cashRemainingPrecisionSchema,
});
export type GastroDiscountEconomicSettlementLine = z.infer<
  typeof gastroDiscountEconomicSettlementLineSchema
>;

export const gastroDiscountEconomicActorSchema = z.object({
  userId: z.string(),
  label: z.string(),
});

/** D-G10-8 — what GASTRO may see of a payment attributed to its discount. */
export const gastroDiscountEconomicPaymentSchema = z.object({
  transferId: z.string(),
  settlementId: z.string(),
  periodKey: z.string(),
  amountCents: moneyCentsStringSchema,
  currency: z.string(),
  transferredAt: z.string().datetime(),
  reference: z.string().nullable(),
  isActive: z.boolean(),
  reversedAt: z.string().datetime().nullable(),
  reversalReason: z.string().nullable(),
});

export const gastroDiscountEconomicAdminPaymentSchema = gastroDiscountEconomicPaymentSchema.extend({
  notes: z.string().nullable(),
  proofUrl: z.string().nullable(),
  registeredBy: gastroDiscountEconomicActorSchema.nullable(),
  reversedBy: gastroDiscountEconomicActorSchema.nullable(),
});

export const gastroDiscountEconomicHistoryEventSchema = z.object({
  at: z.string().datetime(),
  kind: z.enum(GASTRO_DISCOUNT_ECONOMIC_HISTORY_KINDS),
  amountCents: moneyCentsStringSchema.nullable(),
  usageCount: z.number().int().min(0).nullable(),
  settlementId: z.string().nullable(),
  periodKey: z.string().nullable(),
  agreementId: z.string().nullable(),
  replacedAgreementId: z.string().nullable(),
  transferId: z.string().nullable(),
  reference: z.string().nullable(),
  reason: z.string().nullable(),
  effectiveDate: z.string().nullable(),
});

export const gastroDiscountEconomicAdminHistoryEventSchema =
  gastroDiscountEconomicHistoryEventSchema.extend({
    actorLabel: z.string().nullable(),
  });

/** Local-wide barter credit balance — PARTNER_LEVEL ("Saldo general del local"), never per discount. */
export const gastroDiscountEconomicPartnerCreditSchema = z.object({
  precision: z.literal('PARTNER_LEVEL'),
  currency: z.string(),
  balanceAvailableCents: signedMoneyCentsStringSchema,
});

const sharedFields = {
  currency: z.string(),
  discount: gastroDiscountEconomicDiscountSchema,
  validations: gastroDiscountEconomicValidationsSchema,
  cash: gastroDiscountEconomicCashSchema,
  barter: gastroDiscountEconomicBarterSchema,
  settlements: z.array(gastroDiscountEconomicSettlementLineSchema),
  partnerCredit: gastroDiscountEconomicPartnerCreditSchema.nullable(),
};

export const gastroDiscountEconomicSummaryAdminSchema = z.object({
  audience: z.literal('ADMIN'),
  ...sharedFields,
  agreement: agreementBlockSchema(benefitCommercialAgreementDtoSchema),
  payments: z.array(gastroDiscountEconomicAdminPaymentSchema),
  history: z.array(gastroDiscountEconomicAdminHistoryEventSchema),
});

export const gastroDiscountEconomicSummaryGastroSchema = z.object({
  audience: z.literal('GASTRO'),
  ...sharedFields,
  agreement: agreementBlockSchema(gastroDiscountEconomicAgreementTermsSchema),
  payments: z.array(gastroDiscountEconomicPaymentSchema),
  history: z.array(gastroDiscountEconomicHistoryEventSchema),
});

export const gastroDiscountEconomicSummarySchema = z.discriminatedUnion('audience', [
  gastroDiscountEconomicSummaryAdminSchema,
  gastroDiscountEconomicSummaryGastroSchema,
]);

export type GastroDiscountEconomicSummaryAdmin = z.infer<
  typeof gastroDiscountEconomicSummaryAdminSchema
>;
export type GastroDiscountEconomicSummaryGastro = z.infer<
  typeof gastroDiscountEconomicSummaryGastroSchema
>;
export type GastroDiscountEconomicSummary = z.infer<typeof gastroDiscountEconomicSummarySchema>;

/** GASTRO route params: the discount id is the only input (never a profileId). */
export const gastroDiscountEconomicSummaryParamsSchema = z.object({ id: z.string().min(1) });
export type GastroDiscountEconomicSummaryParams = z.infer<
  typeof gastroDiscountEconomicSummaryParamsSchema
>;

/** Field names that must never reach GASTRO (asserted by tests). */
export const GASTRO_DISCOUNT_ECONOMIC_REDACTED_KEYS = [
  'notes',
  'proofUrl',
  'registeredBy',
  'reversedBy',
  'registeredByUserId',
  'reversedByUserId',
  'createdByUserId',
  'actorLabel',
  'tenantId',
] as const;

/** GASTRO projection: same figures, whitelist-parsed (unknown keys are stripped by Zod). */
export function redactGastroDiscountEconomicSummaryForGastro(
  summary: GastroDiscountEconomicSummaryAdmin,
): GastroDiscountEconomicSummaryGastro {
  return gastroDiscountEconomicSummaryGastroSchema.parse({ ...summary, audience: 'GASTRO' });
}
