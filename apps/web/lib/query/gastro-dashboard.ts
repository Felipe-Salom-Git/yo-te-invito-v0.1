'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { GastroValidationListParams } from '@/repositories/interfaces';
import { gastroKeys } from '@/lib/query/keys';

export function useGastroDashboard(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: gastroKeys.dashboard(),
    queryFn: () => repos.gastro.getDashboard(),
    enabled,
  });
}

function validationsFiltersKey(params?: GastroValidationListParams): string {
  return JSON.stringify({
    discountId: params?.discountId ?? '',
    from: params?.from ?? '',
    to: params?.to ?? '',
    page: params?.page ?? 1,
    limit: params?.limit ?? 30,
  });
}

export function useGastroValidationsList(
  params?: GastroValidationListParams,
  enabled = true,
) {
  const repos = useRepositories();
  const key = validationsFiltersKey(params);
  return useQuery({
    queryKey: gastroKeys.validations(key),
    queryFn: () => repos.gastro.listValidations(params),
    enabled,
  });
}
