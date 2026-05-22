'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  buildExploreSearchParams,
  type ExploreFiltersState,
  parseExploreSearchParams,
} from './exploreFilters';

export function useExploreUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters = useMemo(
    () => parseExploreSearchParams(searchParams),
    [searchParams],
  );

  const applyFilters = useCallback(
    (next: ExploreFiltersState) => {
      const normalized: ExploreFiltersState = {
        ...next,
        page: Math.max(1, next.page),
      };
      const qs = buildExploreSearchParams(normalized);
      const href = qs.toString() ? `${pathname}?${qs.toString()}` : pathname;
      router.replace(href, { scroll: false });
    },
    [pathname, router],
  );

  const setFilters = useCallback(
    (patch: Partial<ExploreFiltersState>) => {
      applyFilters({ ...filters, ...patch });
    },
    [applyFilters, filters],
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  return { filters, applyFilters, setFilters, clearFilters };
}
