'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { EventsSearchQuery } from '@/repositories/interfaces';
import { eventsKeys } from './keys';

export { eventsKeys } from './keys';

export function useEventsList(tenantId: string, page = 1, limit = 20) {
  const repos = useRepositories();
  return useQuery({
    queryKey: eventsKeys.list(tenantId, page, limit),
    queryFn: () => repos.events.list({ tenantId, page, limit }),
  });
}

export function useEventsSearch(
  query: EventsSearchQuery,
  options?: { enabled?: boolean }
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: eventsKeys.search(query),
    queryFn: () => repos.events.search(query),
    enabled: options?.enabled ?? !!query.tenantId,
  });
}

export function useEventsTrending(tenantId: string, limit = 10) {
  const repos = useRepositories();
  return useQuery({
    queryKey: eventsKeys.trending(tenantId, limit),
    queryFn: () => repos.events.trending(tenantId, limit),
  });
}

export function useEventDetail(eventId: string, tenantId: string) {
  const repos = useRepositories();
  return useQuery({
    queryKey: eventsKeys.detail(eventId, tenantId),
    queryFn: () => repos.events.getDetail(eventId, tenantId),
    enabled: !!eventId && !!tenantId,
  });
}
