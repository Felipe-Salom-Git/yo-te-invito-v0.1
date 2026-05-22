import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminUsersKeys } from '@/lib/query/keys';
import type { AdminUsersListQuery } from '@/repositories/interfaces';

export function useAdminUsersList(
  query: AdminUsersListQuery,
  filtersKey: string,
  enabled = true,
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminUsersKeys.list(filtersKey),
    queryFn: () => repos.adminUsers.list(query),
    enabled,
  });
}
