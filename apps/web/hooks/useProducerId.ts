'use client';

import { useSession } from 'next-auth/react';

/** Producer ID from session. When USE_API: user.id for PRODUCER_OWNER. Else: producer-demo. */
const DEFAULT_PRODUCER_ID = 'producer-demo';

export function useProducerId(): string {
  const { data: session } = useSession();
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (user?.role === 'PRODUCER_OWNER' || user?.role === 'PRODUCER_STAFF') {
    return user.id ?? DEFAULT_PRODUCER_ID;
  }
  return DEFAULT_PRODUCER_ID;
}
