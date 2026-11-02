'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GastroPromoEventCreateInput, GastroPromoEventUpdateInput } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { gastroKeys } from '@/lib/query/keys';

/** G12.2 — promotional events of the active local (portal). */
export function useGastroPromoEvents(profileId: string | undefined) {
  const repos = useRepositories();
  return useQuery({
    queryKey: gastroKeys.promoEvents(profileId ?? ''),
    queryFn: () => repos.gastro.listPromoEvents(profileId!),
    enabled: !!profileId,
  });
}

export function useGastroPromoEventMutations(profileId: string | undefined) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const invalidate = () => {
    if (profileId) queryClient.invalidateQueries({ queryKey: gastroKeys.promoEvents(profileId) });
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const createMutation = useMutation({
    mutationFn: (input: GastroPromoEventCreateInput) => repos.gastro.createPromoEvent(input),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: GastroPromoEventUpdateInput }) =>
      repos.gastro.updatePromoEvent(id, patch),
    onSuccess: invalidate,
  });
  const submitMutation = useMutation({
    mutationFn: (id: string) => repos.gastro.submitPromoEvent(id),
    onSuccess: invalidate,
  });
  const archiveMutation = useMutation({
    mutationFn: (id: string) => repos.gastro.archivePromoEvent(id),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, submitMutation, archiveMutation };
}
