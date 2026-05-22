'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  buildAdminEventsSearchParams,
  parseAdminEventsSearchParams,
  type AdminEventsFiltersState,
} from './admin-events-filters';

export function useAdminEventsUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseAdminEventsSearchParams(searchParams),
    [searchParams],
  );

  const applyFilters = useCallback(
    (next: AdminEventsFiltersState) => {
      const normalized = { ...next, page: Math.max(1, next.page) };
      const qs = buildAdminEventsSearchParams(normalized);
      const href = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  const setFilters = useCallback(
    (patch: Partial<AdminEventsFiltersState>) => {
      applyFilters({ ...filters, ...patch, page: patch.page ?? 1 });
    },
    [applyFilters, filters],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, applyFilters, setFilters, clearFilters };
}
