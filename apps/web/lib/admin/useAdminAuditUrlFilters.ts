'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  buildAdminAuditSearchParams,
  parseAdminAuditSearchParams,
  type AdminAuditFiltersState,
} from './admin-audit-filters';

export function useAdminAuditUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseAdminAuditSearchParams(searchParams),
    [searchParams],
  );

  const applyFilters = useCallback(
    (next: AdminAuditFiltersState) => {
      const normalized = { ...next, page: Math.max(1, next.page) };
      const qs = buildAdminAuditSearchParams(normalized);
      const href = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  const setFilters = useCallback(
    (patch: Partial<AdminAuditFiltersState>) => {
      applyFilters({ ...filters, ...patch, page: patch.page ?? 1 });
    },
    [applyFilters, filters],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, applyFilters, setFilters, clearFilters };
}
