'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import type { EventSummary } from '@/repositories/interfaces';
import { homeKeys } from './keys';

const TENANT_ID = 'tenant-demo';
const DEFAULT_CITY = 'Buenos Aires';

export interface UseHomeCarouselsOptions {
  /** When provided, nearYou fetches events in this city (personalized path) */
  preferredCity?: string | null;
}

export function useHomeCarousels(options?: UseHomeCarouselsOptions) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const city = options?.preferredCity?.trim() || DEFAULT_CITY;

  const trending = useQuery({
    queryKey: homeKeys.trending(t),
    queryFn: () => repos.events.trending(t, 8),
    enabled: !!t,
  });

  const nearYou = useQuery({
    queryKey: homeKeys.nearYou(t, city),
    queryFn: () => repos.events.list({ tenantId: t, city, limit: 8 }),
    enabled: !!t,
  });

  const now = new Date().toISOString().slice(0, 10);
  const newEvents = useQuery({
    queryKey: homeKeys.new(t, now),
    queryFn: () => repos.events.list({ tenantId: t, dateFrom: now, limit: 8 }),
    enabled: !!t,
  });

  const gastro = useQuery({
    queryKey: homeKeys.category(t, 'gastro'),
    queryFn: () => repos.events.list({ tenantId: t, category: 'gastro', limit: 8 }),
    enabled: !!t,
  });

  const excursion = useQuery({
    queryKey: homeKeys.category(t, 'excursion'),
    queryFn: () => repos.events.list({ tenantId: t, category: 'excursion', limit: 8 }),
    enabled: !!t,
  });

  const rental = useQuery({
    queryKey: homeKeys.category(t, 'rental'),
    queryFn: () => repos.events.list({ tenantId: t, category: 'rental', limit: 8 }),
    enabled: !!t,
  });

  const hotel = useQuery({
    queryKey: homeKeys.category(t, 'hotel'),
    queryFn: () => repos.events.list({ tenantId: t, category: 'hotel', limit: 8 }),
    enabled: !!t,
  });

  return {
    trending: trending.data ?? [],
    nearYou: nearYou.data?.data ?? [],
    newEvents: newEvents.data?.data ?? [],
    gastro: gastro.data?.data ?? [],
    excursion: excursion.data?.data ?? [],
    rental: rental.data?.data ?? [],
    hotel: hotel.data?.data ?? [],
    isLoading:
      trending.isLoading ||
      nearYou.isLoading ||
      gastro.isLoading ||
      excursion.isLoading ||
      rental.isLoading ||
      hotel.isLoading,
  };
}
