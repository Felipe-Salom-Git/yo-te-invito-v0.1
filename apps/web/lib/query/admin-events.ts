import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminEventsKeys } from '@/lib/query/keys';
import type { AdminEventsListQuery } from '@/repositories/interfaces';

export function useAdminEventsList(query: AdminEventsListQuery, filtersKey: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminEventsKeys.list(filtersKey),
    queryFn: () => repos.adminEvents.list(query),
    enabled,
  });
}
