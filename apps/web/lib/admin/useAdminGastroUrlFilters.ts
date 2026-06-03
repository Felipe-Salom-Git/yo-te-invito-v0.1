'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  buildAdminGastroSearchParams,
  parseAdminGastroSearchParams,
  type AdminGastroFiltersState,
} from './admin-gastro-filters';

export function useAdminGastroUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseAdminGastroSearchParams(searchParams),
    [searchParams],
  );

  const applyFilters = useCallback(
    (next: AdminGastroFiltersState) => {
      const normalized = { ...next, page: Math.max(1, next.page) };
      const qs = buildAdminGastroSearchParams(normalized);
      const href = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  const setFilters = useCallback(
    (patch: Partial<AdminGastroFiltersState>) => {
      applyFilters({ ...filters, ...patch, page: patch.page ?? 1 });
    },
    [applyFilters, filters],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, applyFilters, setFilters, clearFilters };
}
