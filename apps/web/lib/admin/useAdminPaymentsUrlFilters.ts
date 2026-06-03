'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  ADMIN_PAYMENTS_DEFAULT_FILTERS,
  type AdminPaymentsFiltersState,
} from './admin-payments-filters';

function parseFilters(params: URLSearchParams): AdminPaymentsFiltersState {
  const provider = params.get('provider') ?? '';
  return {
    q: params.get('q') ?? '',
    provider:
      provider === 'DEMO' || provider === 'GETNET' || provider === 'MERCADOPAGO'
        ? provider
        : '',
    status: params.get('status') ?? '',
    requiresManualReview: params.get('requiresManualReview') === '1',
    createdFrom: params.get('createdFrom') ?? '',
    createdTo: params.get('createdTo') ?? '',
    page: Math.max(1, Number(params.get('page') ?? '1') || 1),
  };
}

function filtersToParams(filters: AdminPaymentsFiltersState): URLSearchParams {
  const p = new URLSearchParams();
  if (filters.q.trim()) p.set('q', filters.q.trim());
  if (filters.provider) p.set('provider', filters.provider);
  if (filters.status.trim()) p.set('status', filters.status.trim());
  if (filters.requiresManualReview) p.set('requiresManualReview', '1');
  if (filters.createdFrom) p.set('createdFrom', filters.createdFrom);
  if (filters.createdTo) p.set('createdTo', filters.createdTo);
  if (filters.page > 1) p.set('page', String(filters.page));
  return p;
}

export function useAdminPaymentsUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseFilters(searchParams ?? new URLSearchParams()),
    [searchParams],
  );

  const setFilters = useCallback(
    (next: AdminPaymentsFiltersState) => {
      const q = filtersToParams(next).toString();
      router.replace(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname);
  }, [pathname, router]);

  return { filters, setFilters, clearFilters, defaults: ADMIN_PAYMENTS_DEFAULT_FILTERS };
}
