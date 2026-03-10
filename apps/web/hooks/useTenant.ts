'use client';

import { useSession } from 'next-auth/react';

const DEFAULT_TENANT_ID = 'tenant-demo';

export function useTenant() {
  const { data: session } = useSession();
  const tenantId = (session?.user as { tenantId?: string })?.tenantId ?? DEFAULT_TENANT_ID;

  return {
    tenantId,
    isAuthenticated: !!session,
  };
}
