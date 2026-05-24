'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { publicPlatformConfigKeys } from '@/lib/query/keys';

const DEFAULT_TENANT_ID = 'tenant-demo';

/**
 * Public institutional contact for footer and other public surfaces.
 * Uses GET /public/platform-config — not /admin/config.
 */
export function usePublicPlatformConfig() {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId ?? DEFAULT_TENANT_ID;

  return useQuery({
    queryKey: publicPlatformConfigKeys.byTenant(t),
    queryFn: () => repos.publicPlatformConfig.get(t),
    staleTime: 60_000,
    retry: 1,
  });
}
