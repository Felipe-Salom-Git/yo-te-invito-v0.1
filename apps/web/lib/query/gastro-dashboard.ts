'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { GastroValidationListParams } from '@/repositories/interfaces';
import { gastroKeys } from '@/lib/query/keys';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';

export function useGastroDashboard(enabled = true) {
  const repos = useRepositories();
  const { profileId } = useGastroActiveLocation();
  return useQuery({
    queryKey: gastroKeys.dashboard(profileId),
    queryFn: () => repos.gastro.getDashboard(profileId),
    enabled,
  });
}

function validationsFiltersKey(
  profileId: string | undefined,
  params?: GastroValidationListParams,
): string {
  return JSON.stringify({
    profileId: profileId ?? '',
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
  const { profileId } = useGastroActiveLocation();
  const key = validationsFiltersKey(profileId, params);
  return useQuery({
    queryKey: gastroKeys.validations(key),
    queryFn: () =>
      repos.gastro.listValidations({
        ...params,
        profileId: profileId ?? params?.profileId,
      }),
    enabled,
  });
}
