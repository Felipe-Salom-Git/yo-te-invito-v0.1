import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import type {
  AdminGastroLocationCreateInput,
  AdminGastroLocationStatusInput,
  AdminGastroLocationUpdateInput,
} from '@yo-te-invito/shared';
import type { AdminGastroLocationDetail } from '@/repositories/interfaces';

export type AdminGastroListQuery = {
  search?: string;
  status?: string;
  hasPendingDiscounts?: boolean;
  page?: number;
  limit?: number;
};

export function useAdminGastroLocationsList(
  query: AdminGastroListQuery,
  filtersKey: string,
  enabled = true,
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminGastroKeys.list(filtersKey),
    queryFn: () => repos.adminGastro.listLocations(query),
    enabled,
  });
}

export function useAdminGastroLocationDetail(profileId: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminGastroKeys.detail(profileId),
    queryFn: () => repos.adminGastro.getLocation(profileId),
    enabled: enabled && !!profileId,
  });
}

export function useAdminGastroLocationCreateMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: AdminGastroLocationCreateInput) =>
      repos.adminGastro.createLocation(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminGastroKeys.all });
    },
  });
}

export function useAdminGastroLocationUpdateMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      profileId,
      body,
    }: {
      profileId: string;
      body: AdminGastroLocationUpdateInput;
    }) => repos.adminGastro.updateLocation(profileId, body),
    onSuccess: (_data: AdminGastroLocationDetail, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: adminGastroKeys.all });
      queryClient.invalidateQueries({ queryKey: adminGastroKeys.detail(profileId) });
    },
  });
}

export function useAdminGastroLocationStatusMutation() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      profileId,
      status,
    }: {
      profileId: string;
      status: AdminGastroLocationStatusInput;
    }) => repos.adminGastro.updateLocationStatus(profileId, { status }),
    onSuccess: (_data, { profileId }) => {
      queryClient.invalidateQueries({ queryKey: adminGastroKeys.all });
      queryClient.invalidateQueries({ queryKey: adminGastroKeys.detail(profileId) });
    },
  });
}
