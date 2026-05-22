import { useQuery } from '@tanstack/react-query';
import type { AdminReviewsReportQuery } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { adminReviewsReportKeys } from '@/lib/query/keys';

export function useAdminReviewsReport(
  query: AdminReviewsReportQuery,
  enabled = true,
) {
  const repos = useRepositories();
  const filtersKey = JSON.stringify(query);
  return useQuery({
    queryKey: adminReviewsReportKeys.report(filtersKey),
    queryFn: () => repos.adminReviews.getReport(query),
    enabled,
  });
}
