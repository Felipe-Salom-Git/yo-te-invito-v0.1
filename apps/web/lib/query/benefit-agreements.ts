import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminBenefitAgreementsKeys } from '@/lib/query/keys';
import type {
  BenefitCommercialAgreementPartnerHistoryQuery,
  CloseBenefitCommercialAgreementBody,
  CreateBenefitCommercialAgreementBody,
  ReplaceBenefitCommercialAgreementBody,
  UpdateBenefitCommercialAgreementNotesBody,
} from '@yo-te-invito/shared';

export function useAdminBenefitAgreementsList(query?: {
  vertical?: string;
  vigency?: string;
  gastroProfileId?: string;
  excursionOperatorId?: string;
  page?: number;
}) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminBenefitAgreementsKeys.list(filtersKey),
    queryFn: () => repos.adminBenefitAgreements.list(query),
  });
}

export function useAdminBenefitAgreement(id: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminBenefitAgreementsKeys.detail(id),
    queryFn: () => repos.adminBenefitAgreements.get(id),
    enabled: enabled && Boolean(id),
  });
}

export function useAdminBenefitAgreementPartnerHistory(
  query: BenefitCommercialAgreementPartnerHistoryQuery | null,
) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminBenefitAgreementsKeys.partnerHistory(filtersKey),
    queryFn: () => repos.adminBenefitAgreements.partnerHistory(query!),
    enabled: Boolean(query),
  });
}

export function useCreateAdminBenefitAgreement() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBenefitCommercialAgreementBody) =>
      repos.adminBenefitAgreements.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBenefitAgreementsKeys.all });
    },
  });
}

export function useCloseAdminBenefitAgreement() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: CloseBenefitCommercialAgreementBody }) =>
      repos.adminBenefitAgreements.close(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBenefitAgreementsKeys.all });
    },
  });
}

export function useReplaceAdminBenefitAgreement() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ReplaceBenefitCommercialAgreementBody }) =>
      repos.adminBenefitAgreements.replace(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBenefitAgreementsKeys.all });
    },
  });
}

export function useUpdateAdminBenefitAgreementNotes() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateBenefitCommercialAgreementNotesBody;
    }) => repos.adminBenefitAgreements.updateNotes(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminBenefitAgreementsKeys.all });
    },
  });
}
