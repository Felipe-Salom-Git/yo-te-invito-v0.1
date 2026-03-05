'use client';

import { useQuery } from '@tanstack/react-query';
import {
  fetchEvents,
  fetchEventsSearch,
  fetchEventsTrending,
} from '../api/events';
import type { EventsSearchQuery } from '../api/events';

const eventsKeys = {
  all: ['events'] as const,
  list: (tenantId: string, page: number, limit: number) =>
    [...eventsKeys.all, 'list', tenantId, page, limit] as const,
  search: (query: EventsSearchQuery) =>
    [...eventsKeys.all, 'search', query] as const,
  trending: (tenantId: string, limit: number) =>
    [...eventsKeys.all, 'trending', tenantId, limit] as const,
};

export function useEventsList(tenantId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: eventsKeys.list(tenantId, page, limit),
    queryFn: () => fetchEvents({ tenantId, page, limit }),
  });
}

export function useEventsSearch(
  query: EventsSearchQuery,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: eventsKeys.search(query),
    queryFn: () => fetchEventsSearch(query),
    enabled: options?.enabled ?? !!query.tenantId,
  });
}

export function useEventsTrending(tenantId: string, limit = 10) {
  return useQuery({
    queryKey: eventsKeys.trending(tenantId, limit),
    queryFn: () => fetchEventsTrending(tenantId, limit),
  });
}
