'use client';

import { useQueries } from '@tanstack/react-query';
import { RECOMMENDED_LIST_MIN_VALID_REVIEWS } from '@yo-te-invito/shared';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import {
  getCrossCategoryRails,
  type CrossCategoryRailMeta,
} from '@/lib/categories/categoryLandingConfig';
import type { EventSummary, Repositories } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { categoryLandingKeys } from './keys';

const TENANT_ID = 'tenant-demo';

const CROSS_CATEGORY_LIMIT = 8;

async function fetchCrossCategoryItems(
  repos: Repositories,
  tenantId: string,
  category: CategoryGatewayId,
): Promise<EventSummary[]> {
  if (category !== 'event') {
    const recommended = await repos.events.recommended({
      tenantId,
      category,
      limit: CROSS_CATEGORY_LIMIT,
      minValidReviews: RECOMMENDED_LIST_MIN_VALID_REVIEWS,
      mode: 'recommended',
    });
    if (recommended.length >= 3) return recommended.slice(0, CROSS_CATEGORY_LIMIT);
  }

  const res = await repos.events.list({
    tenantId,
    category,
    limit: CROSS_CATEGORY_LIMIT,
    page: 1,
    sort: category === 'event' ? 'upcoming' : undefined,
    hasTicketing: category === 'event' ? true : undefined,
    excludeGeneralPublications: category === 'event' ? true : undefined,
  });
  return res.data;
}

/** Discovery rails for other categories at the bottom of a category landing page. */
export function useCrossCategoryRails(selectedCategory: CategoryGatewayId) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const crossRails = getCrossCategoryRails(selectedCategory);

  const results = useQueries({
    queries: crossRails.map((meta: CrossCategoryRailMeta) => ({
      queryKey: categoryLandingKeys.crossCategory(t, selectedCategory, meta.category),
      queryFn: () => fetchCrossCategoryItems(repos, t, meta.category),
      enabled: !!t,
    })),
  });

  return crossRails
    .map((meta, i) => ({
      ...meta,
      items: results[i]?.data ?? [],
      isLoading: results[i]?.isLoading ?? true,
    }))
    .filter((rail) => rail.isLoading || rail.items.length > 0);
}

export { useCategoryCarousels } from './useCategoryCarousels';
