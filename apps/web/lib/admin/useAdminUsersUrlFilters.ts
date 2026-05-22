'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  buildAdminUsersSearchParams,
  parseAdminUsersSearchParams,
  type AdminUsersFiltersState,
} from './admin-users-filters';

export function useAdminUsersUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseAdminUsersSearchParams(searchParams),
    [searchParams],
  );

  const applyFilters = useCallback(
    (next: AdminUsersFiltersState) => {
      const normalized = { ...next, page: Math.max(1, next.page) };
      const qs = buildAdminUsersSearchParams(normalized);
      const href = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  const setFilters = useCallback(
    (patch: Partial<AdminUsersFiltersState>) => {
      applyFilters({ ...filters, ...patch, page: patch.page ?? 1 });
    },
    [applyFilters, filters],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, applyFilters, setFilters, clearFilters };
}
