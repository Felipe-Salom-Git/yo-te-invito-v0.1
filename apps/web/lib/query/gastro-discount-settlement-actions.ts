import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import {
  adminBenefitSettlementsKeys,
  adminCourtesyCreditLedgerKeys,
  adminGastroKeys,
} from '@/lib/query/keys';
import type { DiscountAssignmentRequest } from '@/lib/admin/discount-settlement-actions-ui';

/**
 * G10.D — discount-detail economic actions. Every mutation refreshes the discount economic summary,
 * its pending list and every settlement view (allocation, payment and reversal change all of them).
 */
export function invalidateDiscountEconomics(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: adminGastroKeys.economicSummaries() });
  queryClient.invalidateQueries({ queryKey: adminGastroKeys.discountPendingValidationsAll() });
  queryClient.invalidateQueries({ queryKey: adminBenefitSettlementsKeys.all });
  queryClient.invalidateQueries({ queryKey: adminCourtesyCreditLedgerKeys.all });
}

export function useAdminDiscountPendingValidations(profileId: string, discountId: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminGastroKeys.discountPendingValidations(profileId, discountId),
    queryFn: () => repos.adminGastro.getDiscountPendingValidations(profileId, discountId),
    enabled: Boolean(profileId && discountId),
  });
}

/** CASH / CANJE = allocation only: generate the local's settlement for the period if needed, then allocate. */
export function useAssignDiscountValidations(gastroProfileId: string) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: DiscountAssignmentRequest) => {
      const settlementId =
        request.settlementId ??
        (
          await repos.adminBenefitSettlements.generate({
            vertical: 'GASTRO',
            gastroProfileId,
            periodKey: request.periodKey,
          })
        ).id;
      return repos.adminBenefitSettlements.allocate(settlementId, request.body);
    },
    onSettled: () => invalidateDiscountEconomics(queryClient),
  });
}
