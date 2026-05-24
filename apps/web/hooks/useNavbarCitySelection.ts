'use client';

import { useCallback, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { isExploreMainCategory } from '@/lib/explore/exploreFilters';
import {
  buildNavbarCityNavigationHref,
  NAVBAR_CITY_ALL_VALUE,
  readCityFromSearchParams,
  resolveNavbarCityRoute,
} from '@/lib/navigation/navbarCityConfig';

/** Category scope for discovery city list + navigation. */
export function useNavbarCitySelection() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const route = useMemo(() => resolveNavbarCityRoute(pathname), [pathname]);

  const filterCategory = useMemo(() => {
    if (route.kind === 'category') return route.category;
    if (route.kind === 'explore') {
      const c = searchParams.get('category')?.trim() ?? '';
      return isExploreMainCategory(c) ? c : '';
    }
    return '';
  }, [route, searchParams]);

  const currentCity = useMemo(
    () => readCityFromSearchParams(route.kind, searchParams),
    [route.kind, searchParams],
  );

  const applyCity = useCallback(
    (city: string) => {
      const href = buildNavbarCityNavigationHref(
        { ...route, category: filterCategory || route.category },
        city,
        route.kind === 'explore' ? searchParams : undefined,
      );
      if (route.kind === 'explore') {
        router.replace(href);
      } else {
        router.push(href);
      }
    },
    [route, filterCategory, searchParams, router],
  );

  const clearCity = useCallback(() => {
    applyCity(NAVBAR_CITY_ALL_VALUE);
  }, [applyCity]);

  return {
    route,
    filterCategory,
    currentCity,
    applyCity,
    clearCity,
  };
}
