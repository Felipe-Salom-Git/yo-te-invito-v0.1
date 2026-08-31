import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminCampaignsKeys } from '@/lib/query/keys';
import type { CreateAdminCampaignBody, UpdateAdminCampaignBody } from '@yo-te-invito/shared';

export function useAdminCampaignsList(
  query?: { status?: string; channel?: string; page?: number },
) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminCampaignsKeys.list(filtersKey),
    queryFn: () => repos.adminCampaigns.list(query),
  });
}

export function useAdminCampaign(id: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminCampaignsKeys.detail(id),
    queryFn: () => repos.adminCampaigns.get(id),
    enabled: enabled && Boolean(id),
    refetchInterval: (q) => (q.state.data?.status === 'SENDING' ? 2500 : false),
  });
}

export function useAdminCampaignPreview(id: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminCampaignsKeys.preview(id),
    queryFn: () => repos.adminCampaigns.preview(id),
    enabled: enabled && Boolean(id),
  });
}

export function useAdminCampaignDeliveries(
  id: string,
  query?: { status?: string; page?: number },
) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminCampaignsKeys.deliveries(id, filtersKey),
    queryFn: () => repos.adminCampaigns.listDeliveries(id, query),
    enabled: Boolean(id),
  });
}

export function useAdminCampaignContentPicker(contentType: string, q: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminCampaignsKeys.contentPicker(contentType, q),
    queryFn: () => repos.adminCampaigns.listContentPicker({ contentType, q: q || undefined }),
    enabled: Boolean(contentType),
  });
}

export function useCreateAdminCampaign() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAdminCampaignBody) => repos.adminCampaigns.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCampaignsKeys.all });
    },
  });
}

export function useSendAdminCampaign() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.adminCampaigns.send(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: adminCampaignsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: adminCampaignsKeys.preview(id) });
      queryClient.invalidateQueries({ queryKey: adminCampaignsKeys.all });
    },
  });
}

export function useCancelAdminCampaign() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.adminCampaigns.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCampaignsKeys.all });
    },
  });
}

export function useArchiveAdminCampaign() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.adminCampaigns.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCampaignsKeys.all });
    },
  });
}

export function useDeleteAdminCampaignDraft() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.adminCampaigns.removeDraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCampaignsKeys.all });
    },
  });
}

export function useUpdateAdminCampaign() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAdminCampaignBody }) =>
      repos.adminCampaigns.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCampaignsKeys.all });
    },
  });
}
