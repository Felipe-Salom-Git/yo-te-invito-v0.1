import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminDashboardKeys } from '@/lib/query/keys';

export function useAdminDashboard(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminDashboardKeys.all,
    queryFn: () => repos.adminDashboard.getDashboard(),
    enabled,
  });
}
