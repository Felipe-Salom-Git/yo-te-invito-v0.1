'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cityQueryValue } from '@yo-te-invito/shared';
import { readCityFromSearchParams, resolveNavbarCityRoute } from '@/lib/navigation/navbarCityConfig';
import { readStoredNavbarCity } from '@/lib/navigation/navbarCityStorage';

/** City filter for discovery pages — URL param first, then navbar storage. */
export function useDiscoveryCityFilter(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(() => {
    const route = resolveNavbarCityRoute(pathname);
    const fromUrl = readCityFromSearchParams(route.kind, searchParams);
    if (fromUrl) return fromUrl;
    return readStoredNavbarCity();
  }, [pathname, searchParams]);
}

export function normalizeDiscoveryCityParam(raw: string | null | undefined): string {
  const trimmed = raw?.trim() ?? '';
  return trimmed ? cityQueryValue(trimmed) : '';
}
