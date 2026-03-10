'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Role } from '@yo-te-invito/shared';
import { useRole } from '@/hooks/useRole';

const LOGIN_PATH = '/login';

interface ProtectedLayoutProps {
  children: React.ReactNode;
  /** Required roles (any of). Omit or empty = any authenticated user. */
  allowedRoles?: Role[];
}

export function ProtectedLayout({ children, allowedRoles = [] }: ProtectedLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { session, status, hasRole } = useRole();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      const callbackUrl = encodeURIComponent(pathname ?? '/');
      router.replace(`${LOGIN_PATH}?callbackUrl=${callbackUrl}`);
      return;
    }

    const roles = allowedRoles ?? [];
    if (roles.length > 0 && !hasRole(roles)) {
      router.replace('/home');
    }
  }, [session, status, allowedRoles, hasRole, pathname, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-text-muted">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const roles = allowedRoles ?? [];
  if (roles.length > 0 && !hasRole(roles)) {
    return null;
  }

  return <>{children}</>;
}
