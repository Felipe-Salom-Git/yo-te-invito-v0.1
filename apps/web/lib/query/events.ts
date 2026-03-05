'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../api/events';

const eventsKeys = {
  all: ['events'] as const,
  list: (tenantId: string, page: number, limit: number) =>
    [...eventsKeys.all, 'list', tenantId, page, limit] as const,
};

export function useEventsList(tenantId: string, page = 1, limit = 20) {
  return useQuery({
    queryKey: eventsKeys.list(tenantId, page, limit),
    queryFn: () => fetchEvents({ tenantId, page, limit }),
  });
}
