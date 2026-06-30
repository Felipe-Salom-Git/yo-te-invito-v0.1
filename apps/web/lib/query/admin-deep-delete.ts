import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminDeepDeleteKeys } from '@/lib/query/keys';
import type { AdminDeepDeleteEntityType } from '@yo-te-invito/shared';

export function useAdminDeepDeletePreflight(
  entityType: AdminDeepDeleteEntityType | null,
  entityId: string | null,
  enabled = false,
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminDeepDeleteKeys.preflight(entityType ?? 'USER', entityId ?? ''),
    queryFn: () => repos.adminDeepDelete.getPreflight(entityType!, entityId!),
    enabled: enabled && !!entityType && !!entityId,
  });
}

export function useAdminDeepDeleteMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      entityType: AdminDeepDeleteEntityType;
      entityId: string;
      force: boolean;
      confirmationText: string;
      acknowledgedCriticalHistory: boolean;
    }) =>
      repos.adminDeepDelete.execute(input.entityType, input.entityId, {
        force: input.force,
        confirmationText: input.confirmationText,
        acknowledgedCriticalHistory: input.acknowledgedCriticalHistory,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminDeepDeleteKeys.all });
    },
  });
}
