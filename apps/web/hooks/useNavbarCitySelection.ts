'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cityQueryValue } from '@yo-te-invito/shared';
import { isExploreMainCategory } from '@/lib/explore/exploreFilters';
import {
  buildNavbarCityNavigationHref,
  NAVBAR_CITY_ALL_VALUE,
  readCityFromSearchParams,
  resolveNavbarCityRoute,
} from '@/lib/navigation/navbarCityConfig';
import { readStoredNavbarCity, writeStoredNavbarCity } from '@/lib/navigation/navbarCityStorage';

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
    if (route.kind === 'home') return '';
    return '';
  }, [route, searchParams]);

  const urlCity = useMemo(
    () => readCityFromSearchParams(route.kind, searchParams),
    [route.kind, searchParams],
  );

  const currentCity = useMemo(() => {
    if (urlCity) return urlCity;
    if (route.kind === 'other') return readStoredNavbarCity();
    return '';
  }, [urlCity, route.kind]);

  // Persist URL city to storage so detail pages remember the last selection.
  useEffect(() => {
    if (urlCity) writeStoredNavbarCity(urlCity);
  }, [urlCity]);

  const applyCity = useCallback(
    (city: string) => {
      const normalized = city.trim() ? cityQueryValue(city.trim()) : NAVBAR_CITY_ALL_VALUE;
      writeStoredNavbarCity(normalized);

      if (route.kind === 'other') {
        return;
      }

      const href = buildNavbarCityNavigationHref(
        { ...route, category: filterCategory || route.category },
        normalized,
        route.kind === 'explore' ? searchParams : undefined,
      );
      if (!href) return;
      router.replace(href);
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
