'use client';

import { useSession } from 'next-auth/react';
import type { Role } from '@yo-te-invito/shared';

export function useRole() {
  const sessionState = useSession();
  const session = sessionState?.data ?? null;
  const status = sessionState?.status ?? 'loading';
  const role = session?.user?.role as Role | undefined;

  const hasRole = (allowed: Role | Role[]) => {
    if (!role) return false;
    const list = Array.isArray(allowed) ? allowed : [allowed];
    return list.includes(role);
  };

  return {
    session,
    status,
    role,
    isAuthenticated: !!session,
    hasRole,
  };
}
