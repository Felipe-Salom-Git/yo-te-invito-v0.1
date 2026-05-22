/** Pure helpers for referral payment request validation (unit-tested). */

export const OPEN_REFERRAL_PAYMENT_REQUEST_STATUSES = ['REQUESTED', 'IN_REVIEW'] as const;

export type CommissionPaymentEligibility = {
  status: string;
  referralAttributionId: string | null;
  producerProfileId: string | null;
};

/** Commission IDs already tied to an open payment request for this referrer. */
export function hasOpenRequestCommissionOverlap(
  blockedCommissionIds: string[],
  requestedCommissionIds: string[],
): string[] {
  const blocked = new Set(blockedCommissionIds);
  return requestedCommissionIds.filter((id) => blocked.has(id));
}

/** Returns a machine reason when any commission cannot be included in a V2 payment request. */
export function validateCommissionPaymentEligibility(
  commissions: CommissionPaymentEligibility[],
): 'not_confirmed' | 'no_attribution' | 'no_producer' | null {
  for (const c of commissions) {
    if (c.status !== 'CONFIRMED') return 'not_confirmed';
    if (!c.referralAttributionId) return 'no_attribution';
    if (!c.producerProfileId) return 'no_producer';
  }
  return null;
}

export function allCommissionsSameProducer(
  commissions: Array<{ producerProfileId: string | null }>,
): boolean {
  if (commissions.length === 0) return false;
  const first = commissions[0]!.producerProfileId;
  return first != null && commissions.every((c) => c.producerProfileId === first);
}

/** Producer may only act on payment requests for their own producer profile. */
export function paymentRequestAuthorizedForProducer(
  requestProducerProfileId: string,
  actorProducerProfileId: string,
): boolean {
  return requestProducerProfileId === actorProducerProfileId;
}
