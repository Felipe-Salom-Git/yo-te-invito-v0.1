import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminAuditKeys } from '@/lib/query/keys';
import type { AuditLogsListQuery } from '@/repositories/interfaces';

export function useAdminAuditLogs(
  query: AuditLogsListQuery,
  filtersKey: string,
  enabled = true,
) {
  const repos = useRepositories();
  return useQuery({
    queryKey: adminAuditKeys.list(filtersKey),
    queryFn: () => repos.adminAudit.listLogs(query),
    enabled,
  });
}
