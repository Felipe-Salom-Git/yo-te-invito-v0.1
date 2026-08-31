import { z } from 'zod';
import { assertBenefitSettlementPartnerXor } from '../benefit-settlement';
import { benefitVerticalSchema } from './benefit-commercial-agreements';
import { COURTESY_CREDIT_LEDGER_ENTRY_TYPES } from '../courtesy-credit-ledger';
import { moneyCentsStringSchema, signedMoneyCentsStringSchema } from '../money/benefit-money';

const partnerFieldsBaseSchema = z
  .object({
    vertical: benefitVerticalSchema,
    gastroProfileId: z.string().min(1).optional(),
    excursionOperatorId: z.string().min(1).optional(),
    currency: z.literal('ARS').default('ARS'),
  })
  .strict();

function refineLedgerPartnerXor<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((val, ctx) => {
    const data = val as z.infer<typeof partnerFieldsBaseSchema>;
    if (
      !assertBenefitSettlementPartnerXor(
        data.vertical,
        data.gastroProfileId,
        data.excursionOperatorId,
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'GASTRO requires gastroProfileId only; ACTIVITY requires excursionOperatorId only',
        path: ['vertical'],
      });
    }
  });
}

export const courtesyCreditLedgerListQuerySchema = refineLedgerPartnerXor(
  partnerFieldsBaseSchema.extend({
    type: z.enum(COURTESY_CREDIT_LEDGER_ENTRY_TYPES).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  }),
);

export type CourtesyCreditLedgerListQuery = z.infer<typeof courtesyCreditLedgerListQuerySchema>;

export const courtesyCreditPartnerBalanceQuerySchema = refineLedgerPartnerXor(
  partnerFieldsBaseSchema,
);

export type CourtesyCreditPartnerBalanceQuery = z.infer<
  typeof courtesyCreditPartnerBalanceQuerySchema
>;

export const createCourtesyCreditAdjustmentBodySchema = refineLedgerPartnerXor(
  partnerFieldsBaseSchema.extend({
    amountCents: signedMoneyCentsStringSchema.refine((v) => {
      try {
        return BigInt(v) !== 0n;
      } catch {
        return false;
      }
    }, 'amount must be non-zero'),
    reason: z.string().trim().min(1).max(500),
  }),
);

export type CreateCourtesyCreditAdjustmentBody = z.infer<
  typeof createCourtesyCreditAdjustmentBodySchema
>;

export const reverseCourtesyCreditLedgerEntryBodySchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export type ReverseCourtesyCreditLedgerEntryBody = z.infer<
  typeof reverseCourtesyCreditLedgerEntryBodySchema
>;

export const courtesyCreditLedgerEntryDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  vertical: benefitVerticalSchema,
  gastroProfileId: z.string().nullable(),
  excursionOperatorId: z.string().nullable(),
  type: z.enum(COURTESY_CREDIT_LEDGER_ENTRY_TYPES),
  amountCents: signedMoneyCentsStringSchema,
  currency: z.string(),
  sourceAllocationId: z.string().nullable(),
  sourceCourtesyCampaignId: z.string().nullable(),
  reversalOfEntryId: z.string().nullable(),
  adjustmentReason: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type CourtesyCreditLedgerEntryDto = z.infer<typeof courtesyCreditLedgerEntryDtoSchema>;

export const courtesyCreditLedgerListResponseSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  data: z.array(courtesyCreditLedgerEntryDtoSchema),
});

export type CourtesyCreditLedgerListResponse = z.infer<
  typeof courtesyCreditLedgerListResponseSchema
>;

export const courtesyCreditPartnerBalanceDtoSchema = z.object({
  vertical: benefitVerticalSchema,
  gastroProfileId: z.string().nullable(),
  excursionOperatorId: z.string().nullable(),
  currency: z.string(),
  balanceCents: signedMoneyCentsStringSchema,
  creditGeneratedCents: moneyCentsStringSchema,
  creditConsumedCents: moneyCentsStringSchema,
  balanceAvailableCents: signedMoneyCentsStringSchema,
});

export type CourtesyCreditPartnerBalanceDto = z.infer<
  typeof courtesyCreditPartnerBalanceDtoSchema
>;
