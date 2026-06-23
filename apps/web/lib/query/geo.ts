'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { geoKeys } from './keys';

const PROVINCES_STALE_MS = 24 * 60 * 60 * 1000;
const LOCALITIES_STALE_MS = 12 * 60 * 60 * 1000;

export function useGeoProvinces() {
  const repos = useRepositories();

  return useQuery({
    queryKey: geoKeys.provinces(),
    queryFn: () => repos.geo.listProvinces(),
    staleTime: PROVINCES_STALE_MS,
  });
}

export function useGeoLocalities(province: string | null | undefined) {
  const repos = useRepositories();
  const provinceName = province?.trim() ?? '';

  return useQuery({
    queryKey: geoKeys.localities(provinceName),
    queryFn: () => repos.geo.listLocalities({ province: provinceName }),
    enabled: provinceName.length > 0,
    staleTime: LOCALITIES_STALE_MS,
  });
}
