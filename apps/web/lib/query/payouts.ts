'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { payoutsKeys } from './keys';

export { payoutsKeys } from './keys';

export function usePayoutsByProducer(producerId: string, tenantId?: string) {
  const repos = useRepositories();
  const t = tenantId ?? 'tenant-demo';
  return useQuery({
    queryKey: payoutsKeys.byProducer(producerId),
    queryFn: () => repos.payouts.listByProducer(producerId),
    enabled: !!producerId,
  });
}

export function usePayoutsByEvent(eventId: string, tenantId?: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: payoutsKeys.byEvent(eventId),
    queryFn: () => repos.payouts.listByEvent(eventId),
    enabled: !!eventId,
  });
}

export function useCreatePayout(producerId: string) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  return useMutation({
    mutationFn: (input: {
      tenantId: string;
      eventId: string;
      amountCents: number;
      bankInfo?: { titular?: string; banco?: string; cbu?: string };
      requestedByUserId: string;
    }) =>
      repos.payouts.create({
        ...input,
        producerId,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payoutsKeys.byProducer(producerId) });
    },
  });
}
