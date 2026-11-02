'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useAdminGastroLocationDiscounts, useAdminGastroLocationsList } from '@/lib/query/admin-gastro';
import {
  adminGastroActiveListQuery,
  resolveSettlementPartnerOptions,
  type SettlementPartnerOption,
} from '@/lib/admin/settlement-partner-options';
import { discountOptionLabel } from '@/lib/admin/benefit-agreement-list';

const TENANT_ID = 'tenant-demo';

/** G10.B — Local (or operator) options and, for GASTRO, the discounts of the selected local. */
export function useAgreementPartnerCatalog(
  vertical: '' | 'GASTRO' | 'ACTIVITY',
  partnerId: string,
  cacheTag: string,
) {
  const repos = useRepositories();
  const gastroQuery = useAdminGastroLocationsList(adminGastroActiveListQuery(), cacheTag, vertical !== 'ACTIVITY');
  const operatorsQuery = useQuery({
    queryKey: ['excursion-operators', 'admin-list', TENANT_ID],
    queryFn: () => repos.excursionOperators.listAdmin({ tenantId: TENANT_ID, includeInactive: false }),
    enabled: vertical === 'ACTIVITY',
  });
  const discountsQuery = useAdminGastroLocationDiscounts(partnerId, vertical === 'GASTRO');

  const partnerOptions: SettlementPartnerOption[] = useMemo(
    () => resolveSettlementPartnerOptions(vertical, gastroQuery.data?.data, operatorsQuery.data?.data),
    [vertical, gastroQuery.data, operatorsQuery.data],
  );
  const discountOptions: SettlementPartnerOption[] = useMemo(
    () =>
      (discountsQuery.data?.data ?? []).map((d) => ({
        id: d.id,
        label: discountOptionLabel({ title: d.title, status: d.status, visibility: d.visibility }),
      })),
    [discountsQuery.data],
  );

  return {
    partnerOptions,
    discountOptions,
    partnersLoading: gastroQuery.isLoading || operatorsQuery.isLoading,
    discountsLoading: discountsQuery.isLoading && Boolean(partnerId),
  };
}
