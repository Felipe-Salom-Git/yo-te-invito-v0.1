'use client';

import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';

export function useMe() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id;

  const { data: user, isLoading } = useQuery({
    queryKey: ['me', userId],
    queryFn: () => (userId ? repos.users.getMe(userId) : Promise.resolve(null)),
    enabled: !!userId && status === 'authenticated',
    staleTime: 60_000,
  });

  /** Solo bloquear UI en la carga inicial; no al refetch al volver a la pestaña. */
  const isInitialLoading =
    status === 'loading' || (status === 'authenticated' && isLoading && user === undefined);

  return {
    session,
    user,
    userId,
    status,
    isLoading: isInitialLoading,
    isAuthenticated: status === 'authenticated',
  };
}
