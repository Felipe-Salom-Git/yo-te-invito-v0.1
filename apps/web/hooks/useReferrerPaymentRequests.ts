'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import {
  referrerPaymentRequestKeys,
  referrerCommissionKeys,
  referrerReferralMetricsKeys,
} from '@/lib/query/keys';
import type { CreateReferralPaymentRequestInput } from '@/repositories/interfaces';

export function useReferrerEligibleCommissions(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: referrerPaymentRequestKeys.eligible(),
    queryFn: () => repos.referrals.listReferrerEligibleCommissions(),
    enabled,
  });
}

export function useReferrerPaymentRequests(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: referrerPaymentRequestKeys.list(),
    queryFn: () => repos.referrals.listReferrerPaymentRequests(),
    enabled,
  });
}

export function useReferrerPaymentRequest(id: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: referrerPaymentRequestKeys.detail(id ?? ''),
    queryFn: () => repos.referrals.getReferrerPaymentRequest(id!),
    enabled: !!id,
  });
}

export function useCreateReferrerPaymentRequest() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReferralPaymentRequestInput) =>
      repos.referrals.createReferrerPaymentRequest(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referrerPaymentRequestKeys.all });
      queryClient.invalidateQueries({ queryKey: referrerCommissionKeys.all });
      queryClient.invalidateQueries({ queryKey: referrerReferralMetricsKeys.all });
      queryClient.invalidateQueries({ queryKey: ['referrer', 'dashboard'] });
    },
  });
}

export function useCancelReferrerPaymentRequest() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.referrals.cancelReferrerPaymentRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referrerPaymentRequestKeys.all });
    },
  });
}
