'use client';

import { useRepositories } from '@/repositories/context';
import { useQuery } from '@tanstack/react-query';
import { useMe } from './useMe';
import { mePortalKeys } from '@/lib/query/keys';
import type { UserPortalPreferences } from '@yo-te-invito/shared';

/**
 * Portal preferences for Home V4 and personalization.
 */
export function usePreferences() {
  const { userId, isAuthenticated } = useMe();
  const repos = useRepositories();

  const { data: preferences, isLoading } = useQuery({
    queryKey: mePortalKeys.preferences(),
    queryFn: () => (userId ? repos.mePortal.getPreferences() : Promise.resolve(null)),
    enabled: isAuthenticated && !!userId,
  });

  return {
    preferences: preferences ?? null,
    isLoading,
  };
}

/** Adapter for homeStrategy (city + categories; favorites via API list). */
export function portalPrefsToHomeStrategy(prefs: UserPortalPreferences | null) {
  if (!prefs) return null;
  return {
    preferredCity: prefs.preferredCity,
    preferredCategories: prefs.favoriteCategories?.length ? prefs.favoriteCategories : null,
    favoriteEventIds: null as string[] | null,
  };
}
