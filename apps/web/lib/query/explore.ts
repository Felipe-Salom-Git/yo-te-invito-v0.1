'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import type { EventsSearchQuery } from '@/repositories/interfaces';
import { exploreKeys } from './keys';

const TENANT_ID = 'tenant-demo';

export function useExploreEvents(query: {
  q?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  page?: number;
}) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  const searchQuery: EventsSearchQuery = {
    tenantId: t,
    q: query.q?.trim() || undefined,
    city: query.city?.trim() || undefined,
    category: query.category || undefined,
    dateFrom: query.dateFrom || undefined,
    dateTo: query.dateTo || undefined,
    page: query.page ?? 1,
    limit: 24,
  };

  return useQuery({
    queryKey: exploreKeys.search(searchQuery),
    queryFn: () => repos.events.search(searchQuery),
    enabled: !!t,
  });
}
