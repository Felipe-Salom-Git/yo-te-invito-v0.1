'use client';

import { useSession } from 'next-auth/react';

/** Producer user id from session (API-backed auth). */
export function useProducerId(): string {
  const { data: session } = useSession();
  const user = session?.user as { id?: string; userId?: string; role?: string } | undefined;
  if (user?.role === 'PRODUCER_OWNER' || user?.role === 'PRODUCER_STAFF') {
    return user.userId ?? user.id ?? '';
  }
  return '';
}
