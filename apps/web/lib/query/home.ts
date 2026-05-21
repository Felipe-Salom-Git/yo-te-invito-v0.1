'use client';

import { useQuery } from '@tanstack/react-query';
import { RECOMMENDED_LIST_MIN_VALID_REVIEWS } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import type { EventSummary, Repositories } from '@/repositories/interfaces';
import { homeKeys } from './keys';

const TENANT_ID = 'tenant-demo';
const DEFAULT_CITY = 'Buenos Aires';
const HOME_RAIL_LIMIT = 8;

export interface UseHomeCarouselsOptions {
  /** When provided, nearYou fetches events in this city (personalized path) */
  preferredCity?: string | null;
}

async function fetchCategoryRecommended(
  repos: Repositories,
  tenantId: string,
  category: string,
): Promise<EventSummary[]> {
  const items = await repos.events.recommended({
    tenantId,
    category,
    limit: HOME_RAIL_LIMIT,
    minValidReviews: RECOMMENDED_LIST_MIN_VALID_REVIEWS,
    mode: 'recommended',
  });
  if (items.length > 0) return items;
  const res = await repos.events.list({
    tenantId,
    category,
    limit: HOME_RAIL_LIMIT,
    page: 1,
  });
  return res.data;
}

export function useHomeCarousels(options?: UseHomeCarouselsOptions) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const city = options?.preferredCity?.trim() || DEFAULT_CITY;

  const trending = useQuery({
    queryKey: homeKeys.trending(t),
    queryFn: () => repos.events.trending(t, HOME_RAIL_LIMIT),
    enabled: !!t,
  });

  const recommendedGlobal = useQuery({
    queryKey: homeKeys.recommended(t),
    queryFn: async () => {
      const items = await repos.events.recommended({
        tenantId: t,
        limit: HOME_RAIL_LIMIT,
        minValidReviews: RECOMMENDED_LIST_MIN_VALID_REVIEWS,
        mode: 'recommended',
      });
      if (items.length > 0) return items;
      return repos.events.trending(t, HOME_RAIL_LIMIT);
    },
    enabled: !!t,
  });

  const nearYou = useQuery({
    queryKey: homeKeys.nearYou(t, city),
    queryFn: () => repos.events.list({ tenantId: t, city, limit: HOME_RAIL_LIMIT }),
    enabled: !!t,
  });

  const now = new Date().toISOString().slice(0, 10);
  const newEvents = useQuery({
    queryKey: homeKeys.new(t, now),
    queryFn: () => repos.events.list({ tenantId: t, dateFrom: now, limit: HOME_RAIL_LIMIT }),
    enabled: !!t,
  });

  const gastro = useQuery({
    queryKey: homeKeys.categoryRecommended(t, 'gastro'),
    queryFn: () => fetchCategoryRecommended(repos, t, 'gastro'),
    enabled: !!t,
  });

  const excursion = useQuery({
    queryKey: homeKeys.categoryRecommended(t, 'excursion'),
    queryFn: () => fetchCategoryRecommended(repos, t, 'excursion'),
    enabled: !!t,
  });

  const rental = useQuery({
    queryKey: homeKeys.categoryRecommended(t, 'rental'),
    queryFn: () => fetchCategoryRecommended(repos, t, 'rental'),
    enabled: !!t,
  });

  const hotel = useQuery({
    queryKey: homeKeys.categoryRecommended(t, 'hotel'),
    queryFn: () => fetchCategoryRecommended(repos, t, 'hotel'),
    enabled: !!t,
  });

  return {
    trending: trending.data ?? [],
    recommendedGlobal: recommendedGlobal.data ?? [],
    nearYou: nearYou.data?.data ?? [],
    newEvents: newEvents.data?.data ?? [],
    gastro: gastro.data ?? [],
    excursion: excursion.data ?? [],
    rental: rental.data ?? [],
    hotel: hotel.data ?? [],
    isLoading:
      trending.isLoading ||
      recommendedGlobal.isLoading ||
      nearYou.isLoading ||
      gastro.isLoading ||
      excursion.isLoading ||
      rental.isLoading ||
      hotel.isLoading,
  };
}
