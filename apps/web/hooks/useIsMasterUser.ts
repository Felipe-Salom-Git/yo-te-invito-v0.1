'use client';

import { useSession } from 'next-auth/react';
import { isMasterUserEmail } from '@/lib/navigation/masterUser';

export function useIsMasterUser(): boolean {
  const { data: session } = useSession();
  return isMasterUserEmail(session?.user?.email);
}
