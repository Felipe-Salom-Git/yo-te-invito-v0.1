'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  buildNavbarCityNavigationHref,
  readCityFromSearchParams,
  resolveNavbarCityRoute,
} from '@/lib/navigation/navbarCityConfig';
import { readStoredNavbarCity } from '@/lib/navigation/navbarCityStorage';

/** Sync stored city into URL on discovery routes so filters refetch with ?city=. */
export function useSyncDiscoveryCityUrl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const route = resolveNavbarCityRoute(pathname);
    if (route.kind !== 'home' && route.kind !== 'category' && route.kind !== 'explore') return;

    const urlCity = readCityFromSearchParams(route.kind, searchParams);
    const stored = readStoredNavbarCity();
    if (urlCity || !stored) return;

    const href = buildNavbarCityNavigationHref(
      route,
      stored,
      route.kind === 'explore' ? searchParams : undefined,
    );
    if (href) router.replace(href);
  }, [pathname, searchParams, router]);
}
