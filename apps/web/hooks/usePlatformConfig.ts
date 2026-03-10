'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';

const DEFAULT_TENANT_ID = 'tenant-demo';

/**
 * Load platform config (contact, categories) for the current tenant.
 * Uses default tenant when not authenticated (e.g. Footer on public pages).
 */
export function usePlatformConfig() {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: ['platformConfig', t],
    queryFn: () => repos.platformConfig.get(t),
    staleTime: 60_000,
  });
}
