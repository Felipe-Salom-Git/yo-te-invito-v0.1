import { z } from 'zod';
import { benefitSettlementPeriodKeySchema } from '../benefit-settlement';
import { benefitVerticalSchema } from './benefit-commercial-agreements';
import { moneyCentsStringSchema } from '../money/benefit-money';
import { BENEFIT_INTEGRITY_STATUSES } from '../benefit-settlement-reporting';

export const benefitReportingPeriodQuerySchema = z.object({
  periodKey: benefitSettlementPeriodKeySchema,
  vertical: benefitVerticalSchema.optional(),
  gastroProfileId: z.string().min(1).optional(),
  excursionOperatorId: z.string().min(1).optional(),
});

export type BenefitReportingPeriodQuery = z.infer<typeof benefitReportingPeriodQuerySchema>;

export const benefitReportingPartnersQuerySchema = benefitReportingPeriodQuerySchema.extend({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  integrityStatus: z.enum(BENEFIT_INTEGRITY_STATUSES).optional(),
});

export type BenefitReportingPartnersQuery = z.infer<typeof benefitReportingPartnersQuerySchema>;

export const benefitReportingIntegrityQuerySchema = z.object({
  periodKey: benefitSettlementPeriodKeySchema.optional(),
  vertical: benefitVerticalSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type BenefitReportingIntegrityQuery = z.infer<typeof benefitReportingIntegrityQuerySchema>;

export const benefitReportingKpisSchema = z.object({
  usageCount: z.number().int(),
  baseGeneratedCents: moneyCentsStringSchema,
  cashAllocatedCents: moneyCentsStringSchema,
  cashReceivedCents: moneyCentsStringSchema,
  cashOutstandingCents: moneyCentsStringSchema,
  barterBaseCents: moneyCentsStringSchema,
  barterCreditExpectedCents: moneyCentsStringSchema,
  barterCreditMaterializedCents: moneyCentsStringSchema,
  courtesyCreditConsumedCents: moneyCentsStringSchema,
  courtesyCreditAvailableCents: moneyCentsStringSchema,
});

export type BenefitReportingKpisDto = z.infer<typeof benefitReportingKpisSchema>;

export const benefitReportingMonthlyResponseSchema = z.object({
  periodKey: benefitSettlementPeriodKeySchema,
  currency: z.string(),
  settlementCount: z.number().int(),
  kpis: benefitReportingKpisSchema,
});

export type BenefitReportingMonthlyResponse = z.infer<typeof benefitReportingMonthlyResponseSchema>;

export const benefitReportingPartnerRowSchema = z.object({
  partnerId: z.string(),
  partnerDisplayName: z.string().nullable(),
  vertical: benefitVerticalSchema,
  periodKey: benefitSettlementPeriodKeySchema,
  settlementId: z.string(),
  settlementStatus: z.string(),
  cashCollectionStatus: z.string(),
  integrityStatus: z.enum(BENEFIT_INTEGRITY_STATUSES),
  kpis: benefitReportingKpisSchema,
});

export type BenefitReportingPartnerRowDto = z.infer<typeof benefitReportingPartnerRowSchema>;

export const benefitReportingPartnersResponseSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  data: z.array(benefitReportingPartnerRowSchema),
});

export type BenefitReportingPartnersResponse = z.infer<typeof benefitReportingPartnersResponseSchema>;

export const benefitIntegrityIssueSchema = z.object({
  code: z.string(),
  severity: z.enum(['WARNING', 'ERROR']),
  message: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export type BenefitIntegrityIssueDto = z.infer<typeof benefitIntegrityIssueSchema>;

export const benefitSettlementAuditAgreementSchema = z.object({
  agreementId: z.string(),
  validFrom: z.string(),
  validTo: z.string().nullable(),
  unitPriceCents: moneyCentsStringSchema,
  barterMultiplier: z.string(),
  currency: z.string(),
});

export const benefitSettlementAuditAllocationSchema = z.object({
  allocationId: z.string(),
  validationSource: z.string(),
  validationId: z.string(),
  validatedAt: z.string().datetime(),
  benefitTitle: z.string().nullable(),
  mode: z.string(),
  agreementId: z.string(),
  unitPriceCents: moneyCentsStringSchema,
  barterMultiplier: z.string(),
  baseAmountCents: moneyCentsStringSchema,
  allocatedAt: z.string().datetime(),
  allocatedByLabel: z.string().nullable(),
  creditExpectedCents: moneyCentsStringSchema.optional(),
  creditMaterializedCents: moneyCentsStringSchema.optional(),
  ledgerEntryId: z.string().nullable(),
});

export const benefitSettlementAuditTransferSchema = z.object({
  transferId: z.string(),
  amountCents: moneyCentsStringSchema,
  currency: z.string(),
  transferredAt: z.string().datetime(),
  reference: z.string().nullable(),
  registeredAt: z.string().datetime(),
  registeredByLabel: z.string().nullable(),
  reversed: z.boolean(),
  reversalReason: z.string().nullable(),
  reversedByLabel: z.string().nullable(),
  reversedAt: z.string().datetime().nullable(),
});

export const benefitSettlementAuditCourtesySchema = z.object({
  campaignId: z.string(),
  discountLabel: z.string().nullable(),
  imputedAmountCents: moneyCentsStringSchema,
  createdAt: z.string().datetime(),
  ledgerEntryId: z.string(),
});

export const benefitSettlementAuditLedgerMovementSchema = z.object({
  entryId: z.string(),
  type: z.string(),
  amountCents: z.string(),
  createdAt: z.string().datetime(),
  actorLabel: z.string().nullable(),
  reason: z.string().nullable(),
});

export const benefitSettlementAuditTimelineEventSchema = z.object({
  occurredAt: z.string().datetime(),
  kind: z.string(),
  label: z.string(),
  amountCents: moneyCentsStringSchema.optional(),
  actorLabel: z.string().nullable().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
});

export const benefitSettlementAuditResponseSchema = z.object({
  settlementId: z.string(),
  periodKey: benefitSettlementPeriodKeySchema,
  partnerDisplayName: z.string().nullable(),
  vertical: benefitVerticalSchema,
  integrityStatus: z.enum(BENEFIT_INTEGRITY_STATUSES),
  issues: z.array(benefitIntegrityIssueSchema),
  agreements: z.array(benefitSettlementAuditAgreementSchema),
  allocations: z.array(benefitSettlementAuditAllocationSchema),
  transfers: z.array(benefitSettlementAuditTransferSchema),
  courtesyCampaigns: z.array(benefitSettlementAuditCourtesySchema),
  ledgerMovements: z.array(benefitSettlementAuditLedgerMovementSchema),
  timeline: z.array(benefitSettlementAuditTimelineEventSchema),
});

export type BenefitSettlementAuditResponse = z.infer<typeof benefitSettlementAuditResponseSchema>;

export const benefitReportingIntegrityRowSchema = z.object({
  settlementId: z.string(),
  partnerDisplayName: z.string().nullable(),
  vertical: benefitVerticalSchema,
  periodKey: benefitSettlementPeriodKeySchema,
  integrityStatus: z.enum(BENEFIT_INTEGRITY_STATUSES),
  issues: z.array(benefitIntegrityIssueSchema),
});

export const benefitReportingIntegrityResponseSchema = z.object({
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  checked: z.number().int(),
  ok: z.number().int(),
  warnings: z.number().int(),
  errors: z.number().int(),
  data: z.array(benefitReportingIntegrityRowSchema),
});

export type BenefitReportingIntegrityResponse = z.infer<
  typeof benefitReportingIntegrityResponseSchema
>;
