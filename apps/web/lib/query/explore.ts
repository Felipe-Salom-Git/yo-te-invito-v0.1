'use client';

import { useQuery } from '@tanstack/react-query';
import { exploreDateToApiIso } from '@/lib/explore/exploreFilters';
import type { ExploreFiltersState } from '@/lib/explore/exploreFilters';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import type { EventsSearchQuery } from '@/repositories/interfaces';
import { exploreKeys } from './keys';

const TENANT_ID = 'tenant-demo';

export function exploreFiltersToSearchQuery(
  filters: ExploreFiltersState,
  tenantId: string,
): EventsSearchQuery {
  return {
    tenantId,
    q: filters.q.trim() || undefined,
    city: filters.city.trim() || undefined,
    category: filters.category.trim() || undefined,
    subcategoryId: filters.subcategoryId.trim() || undefined,
    dateFrom: exploreDateToApiIso(filters.dateFrom, false),
    dateTo: exploreDateToApiIso(filters.dateTo, true),
    page: filters.page,
    limit: 24,
  };
}

export function useExploreEvents(filters: ExploreFiltersState) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  const searchQuery = exploreFiltersToSearchQuery(filters, t);

  return useQuery({
    queryKey: exploreKeys.search(searchQuery),
    queryFn: () => repos.events.search(searchQuery),
    enabled: !!t,
  });
}
