'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CheckoutPaymentStatusResponse } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { ordersKeys } from './keys';

export function useCheckoutPaymentStatus(
  orderId: string,
  tenantId: string,
  options?: {
    enabled?: boolean;
    paymentId?: string;
    cancelled?: boolean;
    refetchInterval?: number | false;
  },
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ordersKeys.checkoutStatus(orderId, options?.paymentId),
    queryFn: () =>
      repos.orders.getCheckoutPaymentStatus(orderId, tenantId, {
        paymentId: options?.paymentId,
        cancelled: options?.cancelled,
      }),
    enabled: (options?.enabled ?? true) && !!orderId && !!tenantId,
    refetchInterval: options?.refetchInterval,
    retry: 1,
  });
}

export function useRefreshCheckoutPaymentStatus() {
  const repos = useRepositories();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      paymentId,
      tenantId,
      orderId,
    }: {
      paymentId: string;
      tenantId: string;
      orderId: string;
    }) => repos.orders.refreshCheckoutPaymentStatus(paymentId, tenantId),
    onSuccess: (data: CheckoutPaymentStatusResponse, variables) => {
      queryClient.setQueryData(
        ordersKeys.checkoutStatus(variables.orderId, variables.paymentId),
        data,
      );
      void queryClient.invalidateQueries({ queryKey: ordersKeys.detail(variables.orderId) });
      void queryClient.invalidateQueries({ queryKey: ['mePortal'] });
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

/** Poll while payment is still pending (Getnet / async confirmation). */
export const CHECKOUT_PENDING_POLL_MS = 5000;
export const CHECKOUT_PENDING_POLL_MAX = 12;

export function isCheckoutPhaseFinal(phase: string | undefined): boolean {
  return (
    phase === 'approved' ||
    phase === 'rejected' ||
    phase === 'cancelled' ||
    phase === 'expired' ||
    phase === 'manual_review'
  );
}
