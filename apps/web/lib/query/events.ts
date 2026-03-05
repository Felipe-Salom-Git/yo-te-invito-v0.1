'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchEvents } from '../api/events';

const eventsKeys = {
  all: ['events'] as const,
  list: (page: number, limit: number) =>
    [...eventsKeys.all, 'list', page, limit] as const,
};

export function useEventsList(page = 1, limit = 10) {
  return useQuery({
    queryKey: eventsKeys.list(page, limit),
    queryFn: () => fetchEvents({ page, limit }),
  });
}
