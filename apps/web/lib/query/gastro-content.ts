'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { gastroKeys } from '@/lib/query/keys';
import type { GastroContent, GastroContentStatus } from '@/repositories/interfaces';

export function useGastroContentList(eventId: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: gastroKeys.content(eventId ?? ''),
    queryFn: () => repos.gastro.listContent(eventId!),
    enabled: !!eventId,
  });
}

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
    mutationFn: (input: {
      type: GastroContent['type'];
      title?: string;
      body?: string;
      imageUrl?: string;
      sortOrder?: number;
      status?: GastroContentStatus;
    }) => repos.gastro.createContent(eventId!, input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<GastroContent> }) =>
      repos.gastro.updateContent(id, patch),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation };
}
