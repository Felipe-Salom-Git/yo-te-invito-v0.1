'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producerReferralProposalKeys } from '@/lib/query/keys';
import type { CreateReferralCommercialProposalInput } from '@/repositories/interfaces';

export function useProducerReferralProposals(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: producerReferralProposalKeys.list(),
    queryFn: () => repos.referrals.listProducerReferralProposals(),
    enabled,
  });
}

export function useProducerReferralProposal(proposalId: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: producerReferralProposalKeys.detail(proposalId ?? ''),
    queryFn: () => repos.referrals.getProducerReferralProposal(proposalId!),
    enabled: !!proposalId,
  });
}

export function useCreateProducerReferralProposal() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReferralCommercialProposalInput) =>
      repos.referrals.createProducerReferralProposal(body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: producerReferralProposalKeys.all });
      queryClient.invalidateQueries({ queryKey: ['producer', 'referrers'] });
      queryClient.invalidateQueries({ queryKey: producerReferralProposalKeys.byEvent(variables.eventId) });
    },
  });
}

export function useCancelProducerReferralProposal() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => repos.referrals.cancelProducerReferralProposal(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: producerReferralProposalKeys.all });
    },
  });
}
