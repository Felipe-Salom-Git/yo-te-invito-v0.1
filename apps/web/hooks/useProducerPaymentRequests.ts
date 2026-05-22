'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import {
  producerPaymentRequestKeys,
  referrerCommissionKeys,
  producerReferralMetricsKeys,
  referrerReferralMetricsKeys,
} from '@/lib/query/keys';
import type { RejectReferralPaymentRequestInput } from '@/repositories/interfaces';

export function useProducerPaymentRequests(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: producerPaymentRequestKeys.list(),
    queryFn: () => repos.referrals.listProducerReferralPaymentRequests(),
    enabled,
  });
}

export function useProducerPaymentRequest(id: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: producerPaymentRequestKeys.detail(id ?? ''),
    queryFn: () => repos.referrals.getProducerReferralPaymentRequest(id!),
    enabled: !!id,
  });
}

export function useMarkProducerPaymentRequestInReview() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.referrals.markProducerReferralPaymentRequestInReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: producerPaymentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: producerReferralMetricsKeys.all });
    },
  });
}

export function useMarkProducerPaymentRequestPaid() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.referrals.markProducerReferralPaymentRequestPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: producerPaymentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: producerReferralMetricsKeys.all });
      queryClient.invalidateQueries({ queryKey: referrerReferralMetricsKeys.all });
      queryClient.invalidateQueries({ queryKey: referrerCommissionKeys.all });
    },
  });
}

export function useRejectProducerPaymentRequest() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; body: RejectReferralPaymentRequestInput }) =>
      repos.referrals.rejectProducerReferralPaymentRequest(args.id, args.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: producerPaymentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: producerReferralMetricsKeys.all });
      queryClient.invalidateQueries({ queryKey: referrerReferralMetricsKeys.all });
    },
  });
}
