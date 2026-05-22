'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producerDashboardKeys } from './keys';

export { producerDashboardKeys };

export function useProducerDashboardMetrics(enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: producerDashboardKeys.metrics(),
    queryFn: () => repos.producerDashboard.getMetrics(),
    enabled,
  });
}
