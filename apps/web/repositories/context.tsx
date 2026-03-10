'use client';

import { createContext, useContext, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import type { Repositories } from './interfaces';
import { ApiRepository } from './ApiRepository';
import { ApiClient } from '@/lib/api/client';

const RepositoriesContext = createContext<Repositories | null>(null);

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export function RepositoriesProvider({
  repositories: reposProp,
  children,
}: {
  repositories?: Repositories;
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  const value = useMemo(() => {
    if (reposProp) return reposProp;
    const client = new ApiClient({
      baseUrl: API_BASE,
      getAuth: async () => ({
        token: (session?.user as { accessToken?: string })?.accessToken ?? null,
        userId: (session?.user as { id?: string })?.id ?? null,
      }),
    });
    return new ApiRepository({ client, defaultTenantId: 'tenant-demo' });
  }, [reposProp, session]);

  return (
    <RepositoriesContext.Provider value={value}>
      {children}
    </RepositoriesContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const ctx = useContext(RepositoriesContext);
  if (!ctx) {
    throw new Error('useRepositories must be used within RepositoriesProvider');
  }
  return ctx;
}
