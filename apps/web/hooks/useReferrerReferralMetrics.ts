'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { referrerReferralMetricsKeys } from '@/lib/query/keys';

export function useReferrerReferralMetrics(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: referrerReferralMetricsKeys.global(),
    queryFn: () => repos.referrals.getReferrerReferralMetrics(),
    enabled,
  });
}

export function useReferrerAgreementMetrics(agreementId: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: referrerReferralMetricsKeys.agreement(agreementId ?? ''),
    queryFn: () => repos.referrals.getReferrerAgreementMetrics(agreementId!),
    enabled: !!agreementId,
  });
}
