'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useMe } from './useMe';

/**
 * Thin adapter for user preferences.
 * Used by Home V4 strategy resolver. Only fetches when authenticated.
 */
export function usePreferences() {
  const { userId, isAuthenticated } = useMe();
  const repos = useRepositories();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['userPreferences', userId],
    queryFn: () => (userId ? repos.users.getPreferences(userId) : Promise.resolve(null)),
    enabled: isAuthenticated && !!userId,
  });

  return {
    preferences: preferences ?? null,
    isLoading,
  };
}
