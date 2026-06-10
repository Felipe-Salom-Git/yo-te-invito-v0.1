'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Role } from '@yo-te-invito/shared';
import { PageLoader } from '@/components';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';
import { PORTAL_BODY_CLASS } from '@/lib/navigation/portalLayoutClasses';
import { useRole } from '@/hooks/useRole';
import { useIsMasterUser } from '@/hooks/useIsMasterUser';

/** Portal V2 polish: mobile nav, EmptyState/QueryError, ticket groups, cart UX — see task plan in PR. */
export default function MePortalLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { hasRole } = useRole();
  const isMaster = useIsMasterUser();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
      return;
    }
    if (status === 'authenticated' && hasRole(Role.ADMIN) && !isMaster) {
      router.replace('/admin');
    }
  }, [status, router, pathname, hasRole, isMaster]);

  if (status === 'loading') {
    return (
      <div className={PORTAL_BODY_CLASS}>
        <PageLoader message="Cargando tu espacio…" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  if (hasRole(Role.ADMIN) && !isMaster) {
    return null;
  }

  return (
    <div className={PORTAL_BODY_CLASS}>
      <Link
        href="/home"
        className="mb-4 hidden text-sm text-text-muted hover:text-text md:inline-block"
      >
        ← Volver al inicio
      </Link>
      <PortalLayoutShell portalKey="me" showPublicHomeLink>
        {children}
      </PortalLayoutShell>
    </div>
  );
}
