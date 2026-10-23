'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { gastroKeys } from '@/lib/query/keys';
import { resolveActiveGastroProfileId } from './resolve-active-profile-id';
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

const REMEMBERED_PROFILE_KEY = 'yti.gastro.activeProfileId';

function readRememberedProfileId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const value = sessionStorage.getItem(REMEMBERED_PROFILE_KEY)?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

function writeRememberedProfileId(profileId: string) {
  try {
    sessionStorage.setItem(REMEMBERED_PROFILE_KEY, profileId);
  } catch {
    /* private mode */
  }
}

export function GastroActiveLocationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const repos = useRepositories();

  const profileIdFromUrl = searchParams.get('profileId')?.trim() || undefined;
  const [remembered, setRemembered] = useState<string | undefined>(undefined);
  const [rememberedReady, setRememberedReady] = useState(false);

  useEffect(() => {
    setRemembered(readRememberedProfileId());
    setRememberedReady(true);
  }, []);

  const locationsQuery = useQuery({
    queryKey: gastroKeys.locations(),
    queryFn: () => repos.gastro.listMyLocations(),
  });

  const locations = locationsQuery.data?.data ?? [];
  const awaitingRemembered = !rememberedReady && !profileIdFromUrl && locations.length > 1;

  const profileId = useMemo(() => {
    if (awaitingRemembered) return undefined;
    return resolveActiveGastroProfileId(profileIdFromUrl, locations, remembered);
  }, [awaitingRemembered, profileIdFromUrl, locations, remembered]);

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

  useEffect(() => {
    if (!profileId) return;
    writeRememberedProfileId(profileId);
    setRemembered((current) => (current === profileId ? current : profileId));
  }, [profileId]);

  useEffect(() => {
    if (!rememberedReady || locationsQuery.isLoading || !profileId) return;
    if (profileIdFromUrl === profileId) return;
    setProfileId(profileId);
  }, [rememberedReady, locationsQuery.isLoading, profileId, profileIdFromUrl, setProfileId]);

  const value = useMemo(
    () => ({
      profileId,
      setProfileId,
      locations,
      activeLocation,
      isLoading: locationsQuery.isLoading || awaitingRemembered,
    }),
    [profileId, setProfileId, locations, activeLocation, locationsQuery.isLoading, awaitingRemembered],
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

/** Null outside the gastro portal (admin, producer, master nav on other verticals). */
export function useGastroActiveLocationOptional(): GastroActiveLocationContextValue | null {
  return useContext(GastroActiveLocationContext);
}
