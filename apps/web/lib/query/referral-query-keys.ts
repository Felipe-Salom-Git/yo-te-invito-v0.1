/**
 * TanStack Query keys — Referidos V2 (módulo aislado, sin importar interfaces).
 */

export const referralKeys = {
  eventAssignments: (eventId: string) => ['producer', 'referrers', 'event-assignments', eventId] as const,
  eventLinks: (eventId: string) => ['referralLinks', eventId] as const,
  eventCommissions: (eventId: string) => ['referralCommissions', 'event', eventId] as const,
};

export const producerReferralProposalKeys = {
  all: ['producer', 'referral-proposals'] as const,
  list: () => [...producerReferralProposalKeys.all, 'list'] as const,
  detail: (id: string) => [...producerReferralProposalKeys.all, 'detail', id] as const,
  byEvent: (eventId: string) => [...producerReferralProposalKeys.all, 'event', eventId] as const,
};

export const referrerReferralProposalKeys = {
  all: ['referrer', 'referral-proposals'] as const,
  list: () => [...referrerReferralProposalKeys.all, 'list'] as const,
  detail: (id: string) => [...referrerReferralProposalKeys.all, 'detail', id] as const,
};

export const referrerCommissionKeys = {
  all: ['referrer', 'commissions'] as const,
  list: (userId: string) => [...referrerCommissionKeys.all, userId] as const,
};

export const referrerPaymentRequestKeys = {
  all: ['referrer', 'payment-requests'] as const,
  list: () => [...referrerPaymentRequestKeys.all, 'list'] as const,
  detail: (id: string) => [...referrerPaymentRequestKeys.all, 'detail', id] as const,
  eligible: () => [...referrerPaymentRequestKeys.all, 'eligible'] as const,
};

export const producerPaymentRequestKeys = {
  all: ['producer', 'referral-payment-requests'] as const,
  list: () => [...producerPaymentRequestKeys.all, 'list'] as const,
  detail: (id: string) => [...producerPaymentRequestKeys.all, 'detail', id] as const,
};

export const producerReferralMetricsKeys = {
  all: ['producer', 'referral-metrics'] as const,
  global: () => [...producerReferralMetricsKeys.all, 'global'] as const,
  event: (eventId: string) => [...producerReferralMetricsKeys.all, 'event', eventId] as const,
};

export const referrerReferralMetricsKeys = {
  all: ['referrer', 'referral-metrics'] as const,
  global: () => [...referrerReferralMetricsKeys.all, 'global'] as const,
  agreement: (id: string) => [...referrerReferralMetricsKeys.all, 'agreement', id] as const,
};
