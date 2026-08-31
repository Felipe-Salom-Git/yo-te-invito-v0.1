import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminCourtesyCreditLedgerKeys } from '@/lib/query/keys';
import type {
  CourtesyCreditLedgerListQuery,
  CourtesyCreditPartnerBalanceQuery,
  CreateCourtesyCreditAdjustmentBody,
  ReverseCourtesyCreditLedgerEntryBody,
} from '@yo-te-invito/shared';

export function useAdminCourtesyCreditLedgerList(
  query: CourtesyCreditLedgerListQuery | null,
) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminCourtesyCreditLedgerKeys.list(filtersKey),
    queryFn: () => repos.adminCourtesyCreditLedger.list(query!),
    enabled: Boolean(query?.vertical && (query.gastroProfileId || query.excursionOperatorId)),
  });
}

export function useAdminCourtesyCreditBalance(
  query: CourtesyCreditPartnerBalanceQuery | null,
) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminCourtesyCreditLedgerKeys.balance(filtersKey),
    queryFn: () => repos.adminCourtesyCreditLedger.getBalance(query!),
    enabled: Boolean(query?.vertical && (query.gastroProfileId || query.excursionOperatorId)),
  });
}

export function useCreateCourtesyCreditAdjustment() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCourtesyCreditAdjustmentBody) =>
      repos.adminCourtesyCreditLedger.createAdjustment(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCourtesyCreditLedgerKeys.all });
    },
  });
}

export function useReverseCourtesyCreditLedgerEntry() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      body,
    }: {
      entryId: string;
      body: ReverseCourtesyCreditLedgerEntryBody;
    }) => repos.adminCourtesyCreditLedger.reverseEntry(entryId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminCourtesyCreditLedgerKeys.all });
    },
  });
}
