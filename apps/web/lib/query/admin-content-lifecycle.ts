'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminEventsKeys } from '@/lib/query/keys';

export function usePauseAdminEventMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason?: string }) =>
      repos.adminContentLifecycle.pauseEvent(eventId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminEventsKeys.all });
    },
  });
}

export function useRestoreAdminEventMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, reason }: { eventId: string; reason?: string }) =>
      repos.adminContentLifecycle.restoreEvent(eventId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminEventsKeys.all });
    },
  });
}

export function useRentalLocationLifecycleMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      locationId: string;
      action: 'deactivate' | 'activate';
      reason?: string;
    }) =>
      input.action === 'deactivate'
        ? repos.adminContentLifecycle.deactivateRentalLocation(input.locationId, input.reason)
        : repos.adminContentLifecycle.activateRentalLocation(input.locationId, input.reason),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['rental-locations', 'admin', vars.locationId] });
      void queryClient.invalidateQueries({ queryKey: ['rental-locations', 'admin'] });
    },
  });
}

export function useExcursionOperatorLifecycleMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      operatorId: string;
      action: 'deactivate' | 'activate';
      reason?: string;
    }) =>
      input.action === 'deactivate'
        ? repos.adminContentLifecycle.deactivateExcursionOperator(input.operatorId, input.reason)
        : repos.adminContentLifecycle.activateExcursionOperator(input.operatorId, input.reason),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({
        queryKey: ['excursion-operators', 'admin', vars.operatorId],
      });
      void queryClient.invalidateQueries({ queryKey: ['excursion-operators', 'admin'] });
    },
  });
}
