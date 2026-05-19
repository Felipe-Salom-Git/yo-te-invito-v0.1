'use client';

import { useQueries } from '@tanstack/react-query';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import {
  CATEGORY_LANDING_RAILS,
  getCrossCategoryRails,
  type CategoryLandingRailConfig,
  type CrossCategoryRailMeta,
} from '@/lib/categories/categoryLandingConfig';
import type { EventSummary } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import type { Repositories } from '@/repositories/interfaces';
import { useTenant } from '@/hooks/useTenant';
import { categoryLandingKeys } from './keys';

const TENANT_ID = 'tenant-demo';

function matchCategory(item: EventSummary, category: CategoryGatewayId): boolean {
  const cat = item.category ?? 'event';
  if (category === 'event') return cat === 'event' || !item.category;
  return cat === category;
}

async function fetchRailItems(
  repos: Repositories,
  tenantId: string,
  category: CategoryGatewayId,
  subcategorySlug: string | undefined,
  rail: CategoryLandingRailConfig,
): Promise<EventSummary[]> {
  if (rail.source === 'trending') {
    const trending = await repos.events.trending(tenantId, 24);
    return trending.filter((e) => matchCategory(e, category)).slice(0, 8);
  }
  if (rail.source === 'new') {
    const now = new Date().toISOString().slice(0, 10);
    const res = await repos.events.list({
      tenantId,
      category,
      subcategorySlug,
      dateFrom: now,
      limit: 8,
    });
    return res.data;
  }
  const res = await repos.events.list({
    tenantId,
    category,
    subcategorySlug,
    limit: 8,
  });
  return res.data;
}

export function useCategoryLandingRails(
  category: CategoryGatewayId,
  subcategorySlug?: string | null,
) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const slug = subcategorySlug?.trim() || undefined;
  const rails = CATEGORY_LANDING_RAILS[category];

  const results = useQueries({
    queries: rails.map((rail) => ({
      queryKey: categoryLandingKeys.rails(t, category, `${slug ?? ''}:${rail.id}`),
      queryFn: () => fetchRailItems(repos, t, category, slug, rail),
      enabled: !!t,
    })),
  });

  return rails.map((rail, i) => ({
    ...rail,
    items: results[i]?.data ?? [],
    isLoading: results[i]?.isLoading ?? true,
  }));
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
