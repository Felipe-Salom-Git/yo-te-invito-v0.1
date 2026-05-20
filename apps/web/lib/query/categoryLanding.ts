'use client';

import { useQueries } from '@tanstack/react-query';
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

function matchCategory(item: EventSummary, category: CategoryGatewayId): boolean {
  const cat = item.category ?? 'event';
  if (category === 'event') return cat === 'event' || !item.category;
  return cat === category;
}

const CROSS_CATEGORY_LIMIT = 8;

async function fetchCrossCategoryItems(
  repos: Repositories,
  tenantId: string,
  category: CategoryGatewayId,
): Promise<EventSummary[]> {
  const trending = await repos.events.trending(tenantId, 20);
  const filtered = trending.filter((e) => matchCategory(e, category));
  if (filtered.length >= 4) {
    return filtered.slice(0, CROSS_CATEGORY_LIMIT);
  }
  const res = await repos.events.list({ tenantId, category, limit: CROSS_CATEGORY_LIMIT });
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

  return crossRails.map((meta, i) => ({
    ...meta,
    items: results[i]?.data ?? [],
    isLoading: results[i]?.isLoading ?? true,
  }));
}

export { useCategoryCarousels } from './useCategoryCarousels';
