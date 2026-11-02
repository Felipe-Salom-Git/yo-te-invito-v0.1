import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminBenefitAgreementsKeys, adminGastroKeys } from '@/lib/query/keys';
import type {
  BenefitCommercialAgreementPartnerHistoryQuery,
  CloseBenefitCommercialAgreementBody,
  CreateBenefitCommercialAgreementBody,
  ReplaceBenefitCommercialAgreementBody,
  UpdateBenefitCommercialAgreementNotesBody,
} from '@yo-te-invito/shared';

/** Agreement changes also change the discount's economic summary (G10.C). */
function invalidateAgreementViews(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: adminBenefitAgreementsKeys.all });
  queryClient.invalidateQueries({ queryKey: adminGastroKeys.economicSummaries() });
}

export function useAdminBenefitAgreementsList(
  query?: {
    vertical?: string;
    vigency?: string;
    gastroProfileId?: string;
    gastroDiscountId?: string;
    excursionOperatorId?: string;
    scope?: string;
    page?: number;
  },
  enabled = true,
) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminBenefitAgreementsKeys.list(filtersKey),
    queryFn: () => repos.adminBenefitAgreements.list(query),
    enabled,
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

/** G10.B — contract (current + history + legacy used) of ONE discount. */
export function useAdminBenefitAgreementDiscountHistory(discountId: string | null) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminBenefitAgreementsKeys.discountHistory(discountId ?? ''),
    queryFn: () => repos.adminBenefitAgreements.discountHistory(discountId!),
    enabled: Boolean(discountId),
  });
}

export function useCreateAdminBenefitAgreement() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateBenefitCommercialAgreementBody) =>
      repos.adminBenefitAgreements.create(body),
    onSuccess: () => {
      invalidateAgreementViews(queryClient);
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
      invalidateAgreementViews(queryClient);
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
      invalidateAgreementViews(queryClient);
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
      invalidateAgreementViews(queryClient);
    },
  });
}
