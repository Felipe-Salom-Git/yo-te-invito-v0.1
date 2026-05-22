import { z } from 'zod';
import { referralCommissionTypeSchema } from './referral-proposals';
import { referralPaymentRequestStatusSchema } from './referral-payment-requests';

export const referralMetricsPerfSchema = z.object({
  ticketsSoldCount: z.number().int(),
  attributedGrossCents: z.number().int(),
  paidOrdersCount: z.number().int(),
});
export type ReferralMetricsPerf = z.infer<typeof referralMetricsPerfSchema>;

export const producerReferralMetricsGlobalSchema = z.object({
  activeReferrersCount: z.number().int(),
  pendingProposalsCount: z.number().int(),
  activeLinksCount: z.number().int(),
  ticketsSoldCount: z.number().int(),
  attributedGrossCents: z.number().int(),
  commissionGeneratedCents: z.number().int(),
  commissionPendingToRequestCents: z.number().int(),
  paymentRequestsPendingCount: z.number().int(),
  paymentRequestsMarkedPaidCount: z.number().int(),
  paymentRequestsMarkedPaidCents: z.number().int(),
});
export type ProducerReferralMetricsGlobal = z.infer<typeof producerReferralMetricsGlobalSchema>;

export const producerReferralMetricsByReferrerSchema = z.object({
  referrerProfileId: z.string(),
  displayName: z.string(),
  publicHandle: z.string().nullable(),
  eventsPromotedCount: z.number().int(),
  ticketsSoldCount: z.number().int(),
  attributedGrossCents: z.number().int(),
  commissionGeneratedCents: z.number().int(),
  commissionPendingToRequestCents: z.number().int(),
  pendingPaymentRequestsCount: z.number().int(),
  lastActivityAt: z.string().datetime().nullable(),
});
export type ProducerReferralMetricsByReferrer = z.infer<typeof producerReferralMetricsByReferrerSchema>;

export const producerReferralMetricsByEventSchema = z.object({
  eventId: z.string(),
  eventTitle: z.string(),
  eventStatus: z.string(),
  activeLinksCount: z.number().int(),
  participatingReferrersCount: z.number().int(),
  ticketsSoldCount: z.number().int(),
  attributedGrossCents: z.number().int(),
  commissionGeneratedCents: z.number().int(),
});
export type ProducerReferralMetricsByEvent = z.infer<typeof producerReferralMetricsByEventSchema>;

export const producerReferralMetricsResponseSchema = z.object({
  global: producerReferralMetricsGlobalSchema,
  byReferrer: z.array(producerReferralMetricsByReferrerSchema),
  byEvent: z.array(producerReferralMetricsByEventSchema).optional(),
});
export type ProducerReferralMetricsResponse = z.infer<typeof producerReferralMetricsResponseSchema>;

export const producerEventReferralMetricsResponseSchema = z.object({
  eventId: z.string(),
  eventTitle: z.string(),
  global: producerReferralMetricsGlobalSchema,
  byReferrer: z.array(producerReferralMetricsByReferrerSchema),
});
export type ProducerEventReferralMetricsResponse = z.infer<
  typeof producerEventReferralMetricsResponseSchema
>;

export const referrerReferralMetricsGlobalSchema = z.object({
  pendingProposalsCount: z.number().int(),
  activeAgreementsCount: z.number().int(),
  activeLinksCount: z.number().int(),
  ticketsSoldCount: z.number().int(),
  attributedGrossCents: z.number().int(),
  commissionGeneratedCents: z.number().int(),
  commissionPendingToRequestCents: z.number().int(),
  paymentRequestsInReviewCount: z.number().int(),
  paymentRequestsPendingCount: z.number().int(),
  markedPaidByProducerCents: z.number().int(),
});
export type ReferrerReferralMetricsGlobal = z.infer<typeof referrerReferralMetricsGlobalSchema>;

export const referrerReferralMetricsByAgreementSchema = z.object({
  agreementId: z.string(),
  producerProfileId: z.string(),
  producerDisplayName: z.string(),
  eventId: z.string(),
  eventTitle: z.string(),
  referralLinkId: z.string(),
  referralCode: z.string(),
  referralUrl: z.string(),
  commissionType: referralCommissionTypeSchema,
  commissionValue: z.number(),
  agreementStatus: z.string(),
  ticketsSoldCount: z.number().int(),
  attributedGrossCents: z.number().int(),
  commissionGeneratedCents: z.number().int(),
  commissionPendingToRequestCents: z.number().int(),
  paymentRequestStatus: referralPaymentRequestStatusSchema.nullable(),
});
export type ReferrerReferralMetricsByAgreement = z.infer<
  typeof referrerReferralMetricsByAgreementSchema
>;

export const referrerReferralMetricsResponseSchema = z.object({
  global: referrerReferralMetricsGlobalSchema,
  byAgreement: z.array(referrerReferralMetricsByAgreementSchema),
});
export type ReferrerReferralMetricsResponse = z.infer<typeof referrerReferralMetricsResponseSchema>;

export const referrerAgreementMetricsResponseSchema = z.object({
  agreement: referrerReferralMetricsByAgreementSchema,
});
export type ReferrerAgreementMetricsResponse = z.infer<typeof referrerAgreementMetricsResponseSchema>;
