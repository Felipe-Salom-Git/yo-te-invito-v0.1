import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import {
  adminBenefitSettlementsKeys,
  adminCourtesyCreditLedgerKeys,
} from '@/lib/query/keys';
import type {
  AllocateBenefitSettlementUsagesBody,
  GenerateBenefitSettlementBody,
  RegisterBenefitSettlementTransferBody,
  ReverseBenefitSettlementTransferBody,
} from '@yo-te-invito/shared';

export function useAdminBenefitSettlementsList(query?: {
  vertical?: string;
  gastroProfileId?: string;
  excursionOperatorId?: string;
  periodKey?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query ?? {});
  return useQuery({
    queryKey: adminBenefitSettlementsKeys.list(filtersKey),
    queryFn: () => repos.adminBenefitSettlements.list(query),
  });
}

export function useAdminBenefitSettlement(id: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminBenefitSettlementsKeys.detail(id),
    queryFn: () => repos.adminBenefitSettlements.get(id),
    enabled: enabled && Boolean(id),
  });
}

export function useAdminBenefitSettlementTransfers(id: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminBenefitSettlementsKeys.transfers(id),
    queryFn: () => repos.adminBenefitSettlements.listTransfers(id),
    enabled: enabled && Boolean(id),
  });
}

function invalidateSettlementQueries(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: adminBenefitSettlementsKeys.all });
  if (id) {
    queryClient.invalidateQueries({ queryKey: adminBenefitSettlementsKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: adminBenefitSettlementsKeys.transfers(id) });
  }
  queryClient.invalidateQueries({ queryKey: adminCourtesyCreditLedgerKeys.all });
}

export function useGenerateAdminBenefitSettlement() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateBenefitSettlementBody) =>
      repos.adminBenefitSettlements.generate(body),
    onSuccess: (data) => {
      invalidateSettlementQueries(queryClient, data.id);
    },
  });
}

export function useRefreshAdminBenefitSettlement() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.adminBenefitSettlements.refresh(id),
    onSuccess: (data) => {
      invalidateSettlementQueries(queryClient, data.id);
    },
  });
}

export function useAllocateAdminBenefitSettlement() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: AllocateBenefitSettlementUsagesBody;
    }) => repos.adminBenefitSettlements.allocate(id, body),
    onSuccess: (data) => {
      invalidateSettlementQueries(queryClient, data.settlement.id);
    },
  });
}

export function useCloseAdminBenefitSettlement() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repos.adminBenefitSettlements.close(id),
    onSuccess: (data) => {
      invalidateSettlementQueries(queryClient, data.id);
    },
  });
}

export function useRegisterAdminBenefitSettlementTransfer() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: RegisterBenefitSettlementTransferBody;
    }) => repos.adminBenefitSettlements.registerTransfer(id, body),
    onSuccess: (_data, vars) => {
      invalidateSettlementQueries(queryClient, vars.id);
    },
  });
}

export function useReverseAdminBenefitSettlementTransfer() {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      transferId,
      body,
    }: {
      id: string;
      transferId: string;
      body: ReverseBenefitSettlementTransferBody;
    }) => repos.adminBenefitSettlements.reverseTransfer(id, transferId, body),
    onSuccess: (_data, vars) => {
      invalidateSettlementQueries(queryClient, vars.id);
    },
  });
}
