'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { referrerReferralProposalKeys, referrerCommissionKeys } from '@/lib/query/keys';

export function useReferrerProposals(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: referrerReferralProposalKeys.list(),
    queryFn: () => repos.referrals.listReferrerProposals(),
    enabled,
  });
}

export function useReferrerProposal(proposalId: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: referrerReferralProposalKeys.detail(proposalId ?? ''),
    queryFn: () => repos.referrals.getReferrerProposal(proposalId!),
    enabled: !!proposalId,
  });
}

export function useAcceptReferralProposal() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => repos.referrals.acceptReferrerProposal(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referrerReferralProposalKeys.all });
      queryClient.invalidateQueries({ queryKey: ['referrer', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: referrerCommissionKeys.all });
    },
  });
}

export function useRejectReferralProposal() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (proposalId: string) => repos.referrals.rejectReferrerProposal(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referrerReferralProposalKeys.all });
    },
  });
}
