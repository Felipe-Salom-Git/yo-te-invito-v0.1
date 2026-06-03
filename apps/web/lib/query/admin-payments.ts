'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminPaymentMarkReviewedInput,
  AdminPaymentsListQuery,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { adminPaymentsKeys } from './keys';

export function useAdminPayments(
  query: AdminPaymentsListQuery,
  filtersKey: string,
  enabled: boolean,
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminPaymentsKeys.list(filtersKey),
    queryFn: () => repos.adminPayments.list(query),
    enabled,
  });
}

export function useAdminPaymentDetail(paymentId: string, enabled: boolean) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminPaymentsKeys.detail(paymentId),
    queryFn: () => repos.adminPayments.getDetail(paymentId),
    enabled: enabled && !!paymentId,
  });
}

export function useReconcileAdminPayment() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) => repos.adminPayments.reconcile(paymentId),
    onSuccess: (_data, paymentId) => {
      void queryClient.invalidateQueries({ queryKey: adminPaymentsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminPaymentsKeys.detail(paymentId) });
    },
  });
}

export function useMarkAdminPaymentReviewed() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      input,
    }: {
      paymentId: string;
      input: AdminPaymentMarkReviewedInput;
    }) => repos.adminPayments.markReviewed(paymentId, input),
    onSuccess: (_data, { paymentId }) => {
      void queryClient.invalidateQueries({ queryKey: adminPaymentsKeys.all });
      void queryClient.invalidateQueries({ queryKey: adminPaymentsKeys.detail(paymentId) });
    },
  });
}
