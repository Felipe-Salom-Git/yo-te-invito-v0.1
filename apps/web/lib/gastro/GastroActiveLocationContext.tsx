'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { gastroKeys } from '@/lib/query/keys';
import type { GastroLocationSummary } from '@yo-te-invito/shared';

type GastroActiveLocationContextValue = {
  profileId: string | undefined;
  setProfileId: (id: string | undefined) => void;
  locations: GastroLocationSummary[];
  activeLocation: GastroLocationSummary | undefined;
  isLoading: boolean;
};

const GastroActiveLocationContext = createContext<GastroActiveLocationContextValue | null>(
  null,
);

export function GastroActiveLocationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const repos = useRepositories();

  const profileIdFromUrl = searchParams.get('profileId')?.trim() || undefined;

  const locationsQuery = useQuery({
    queryKey: gastroKeys.locations(),
    queryFn: () => repos.gastro.listMyLocations(),
  });

  const locations = locationsQuery.data?.data ?? [];

  const profileId = useMemo(() => {
    if (profileIdFromUrl && locations.some((l) => l.id === profileIdFromUrl)) {
      return profileIdFromUrl;
    }
    const active = locations.find((l) => l.status === 'ACTIVE');
    if (active) return active.id;
    return locations[0]?.id;
  }, [profileIdFromUrl, locations]);

  const setProfileId = useCallback(
    (id: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) params.set('profileId', id);
      else params.delete('profileId');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const activeLocation = locations.find((l) => l.id === profileId);

  const value = useMemo(
    () => ({
      profileId,
      setProfileId,
      locations,
      activeLocation,
      isLoading: locationsQuery.isLoading,
    }),
    [profileId, setProfileId, locations, activeLocation, locationsQuery.isLoading],
  );

  return (
    <GastroActiveLocationContext.Provider value={value}>
      {children}
    </GastroActiveLocationContext.Provider>
  );
}

export function useGastroActiveLocation(): GastroActiveLocationContextValue {
  const ctx = useContext(GastroActiveLocationContext);
  if (!ctx) {
    throw new Error('useGastroActiveLocation must be used within GastroActiveLocationProvider');
  }
  return ctx;
}
