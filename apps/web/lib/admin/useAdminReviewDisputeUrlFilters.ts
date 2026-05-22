'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  buildAdminReviewDisputeSearchParams,
  parseAdminReviewDisputeSearchParams,
  type AdminReviewDisputeFiltersState,
} from './admin-review-dispute-filters';

export function useAdminReviewDisputeUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseAdminReviewDisputeSearchParams(searchParams),
    [searchParams],
  );

  const applyFilters = useCallback(
    (next: AdminReviewDisputeFiltersState) => {
      const normalized = { ...next, page: Math.max(1, next.page) };
      const qs = buildAdminReviewDisputeSearchParams(normalized);
      const href = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  const setFilters = useCallback(
    (patch: Partial<AdminReviewDisputeFiltersState>) => {
      applyFilters({ ...filters, ...patch, page: patch.page ?? 1 });
    },
    [applyFilters, filters],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, applyFilters, setFilters, clearFilters };
}
