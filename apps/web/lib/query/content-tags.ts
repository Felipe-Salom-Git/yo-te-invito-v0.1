'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AdminContentTagsListParams,
  ContentMainCategory,
  ContentTagAdmin,
} from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { contentTagsKeys } from './keys';

const TENANT_ID = 'tenant-demo';

function filtersKey(params: AdminContentTagsListParams): string {
  return JSON.stringify(params);
}

export function usePublicContentTags(category: ContentMainCategory | null) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  return useQuery({
    queryKey: contentTagsKeys.public(t, category ?? 'all'),
    queryFn: () => repos.contentTags.listPublic(t, category ?? undefined),
    enabled: !!t,
  });
}

export function useAdminContentTags(params: AdminContentTagsListParams) {
  const repos = useRepositories();

  return useQuery({
    queryKey: contentTagsKeys.adminList(filtersKey(params)),
    queryFn: () => repos.contentTags.listAdmin(params),
  });
}

export function useAdminContentTagsMutations(params: AdminContentTagsListParams) {
  const repos = useRepositories();
  const qc = useQueryClient();
  const listKey = contentTagsKeys.adminList(filtersKey(params));

  const invalidate = () => qc.invalidateQueries({ queryKey: contentTagsKeys.all });

  const create = useMutation({
    mutationFn: (input: Parameters<typeof repos.contentTags.create>[0]) =>
      repos.contentTags.create(input),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Parameters<typeof repos.contentTags.update>[1];
    }) => repos.contentTags.update(id, patch),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (id: string) => repos.contentTags.archive(id),
    onSuccess: invalidate,
  });

  const restore = useMutation({
    mutationFn: (id: string) => repos.contentTags.restore(id),
    onSuccess: invalidate,
  });

  return { create, update, archive, restore, listKey };
}

export type { ContentTagAdmin };
