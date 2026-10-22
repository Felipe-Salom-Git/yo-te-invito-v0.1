'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { gastroKeys } from '@/lib/query/keys';
import type { GastroContent, GastroContentStatus } from '@/repositories/interfaces';

export type GastroContentWriteInput = {
  type: GastroContent['type'];
  title?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  galleryUrls?: string[] | null;
  sortOrder?: number;
  status?: GastroContentStatus;
};

export function useGastroContentListByProfile(profileId: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: gastroKeys.contentByProfile(profileId ?? ''),
    queryFn: () => repos.gastro.listContentByProfile(profileId),
    enabled: !!profileId,
  });
}

/** @deprecated Prefer useGastroContentListByProfile */
export function useGastroContentList(eventId: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: gastroKeys.content(eventId ?? ''),
    queryFn: () => repos.gastro.listContent(eventId!),
    enabled: !!eventId,
  });
}

export function useGastroContentMutationsByProfile(profileId: string | undefined) {
  const repos = useRepositories();
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (profileId) {
      queryClient.invalidateQueries({
        queryKey: gastroKeys.contentByProfile(profileId),
      });
    }
    queryClient.invalidateQueries({ queryKey: ['public', 'gastro-locations'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: GastroContentWriteInput) =>
      repos.gastro.createContentForProfile(profileId, input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<GastroContentWriteInput>;
    }) => repos.gastro.updateContent(id, patch),
    onSuccess: invalidate,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => repos.gastro.archiveContent(id),
    onSuccess: invalidate,
  });

  const reorderMutation = useMutation({
    mutationFn: (orderedIds: string[]) =>
      repos.gastro.reorderContent(profileId, orderedIds),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, archiveMutation, reorderMutation };
}

/** @deprecated Prefer useGastroContentMutationsByProfile */
export function useGastroContentMutations(eventId: string | undefined) {
  const repos = useRepositories();
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: gastroKeys.content(eventId) });
    }
    queryClient.invalidateQueries({ queryKey: ['public', 'gastro-locations'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: GastroContentWriteInput) =>
      repos.gastro.createContent(eventId!, input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<GastroContent> }) =>
      repos.gastro.updateContent(id, patch),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation };
}
