'use client';

import { useQuery } from '@tanstack/react-query';
import { exploreDateToApiIso } from '@/lib/explore/exploreFilters';
import type { ExploreFiltersState } from '@/lib/explore/exploreFilters';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import type { EventsSearchQuery, PublicSubcategorySummary } from '@/repositories/interfaces';
import { exploreKeys } from './keys';

const TENANT_ID = 'tenant-demo';

export function exploreFiltersToSearchQuery(
  filters: ExploreFiltersState,
  tenantId: string,
  subcategories?: PublicSubcategorySummary[],
): EventsSearchQuery {
  const category = filters.category.trim() || undefined;
  let subcategoryId = filters.subcategoryId.trim() || undefined;
  let subcategorySlug = filters.subcategorySlug.trim() || undefined;

  if (!subcategoryId && subcategorySlug && subcategories?.length) {
    const match = subcategories.find((s) => s.slug === subcategorySlug);
    if (match) {
      subcategoryId = match.id;
      subcategorySlug = undefined;
    }
  }

  return {
    tenantId,
    q: filters.q.trim() || undefined,
    city: filters.city.trim() || undefined,
    category,
    subcategoryId,
    subcategorySlug: subcategoryId ? undefined : subcategorySlug,
    dateFrom: exploreDateToApiIso(filters.dateFrom, false),
    dateTo: exploreDateToApiIso(filters.dateTo, true),
    page: filters.page,
    limit: 24,
  };
}

export function useExploreEvents(
  filters: ExploreFiltersState,
  subcategories: PublicSubcategorySummary[] = [],
) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  const searchQuery = exploreFiltersToSearchQuery(filters, t, subcategories);

  return useQuery({
    queryKey: exploreKeys.search(searchQuery),
    queryFn: () => repos.events.search(searchQuery),
    enabled: !!t,
  });
}
