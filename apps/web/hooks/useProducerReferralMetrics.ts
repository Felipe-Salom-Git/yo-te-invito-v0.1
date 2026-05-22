'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producerReferralMetricsKeys } from '@/lib/query/keys';

export function useProducerReferralMetrics(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: producerReferralMetricsKeys.global(),
    queryFn: () => repos.referrals.getProducerReferralMetrics(),
    enabled,
  });
}

export function useProducerEventReferralMetrics(eventId: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: producerReferralMetricsKeys.event(eventId),
    queryFn: () => repos.referrals.getProducerEventReferralMetrics(eventId),
    enabled: enabled && !!eventId,
  });
}
