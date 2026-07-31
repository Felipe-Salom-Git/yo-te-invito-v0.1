'use client';

import { useQuery } from '@tanstack/react-query';
import { exploreDateToApiIso } from '@/lib/explore/exploreFilters';
import type { ExploreFiltersState } from '@/lib/explore/exploreFilters';
import { cityQueryValue } from '@yo-te-invito/shared';
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
    city: filters.city.trim() ? cityQueryValue(filters.city.trim()) : undefined,
    category,
    subcategoryId,
    subcategorySlug: subcategoryId ? undefined : subcategorySlug,
    dateFrom: exploreDateToApiIso(filters.dateFrom, false),
    dateTo: exploreDateToApiIso(filters.dateTo, true),
    tag: filters.tag.trim() || undefined,
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

const SUGGESTIONS_MIN_CHARS = 2;
const SUGGESTIONS_LIMIT = 8;

export function useExploreSuggestions(rawQuery: string, enabled = true) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const q = rawQuery.trim();
  const canFetch = enabled && !!t && q.length >= SUGGESTIONS_MIN_CHARS;

  return useQuery({
    queryKey: exploreKeys.suggestions(t, q, SUGGESTIONS_LIMIT),
    queryFn: () =>
      repos.events.suggestions({
        tenantId: t,
        q,
        limit: SUGGESTIONS_LIMIT,
      }),
    enabled: canFetch,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export { SUGGESTIONS_MIN_CHARS };
