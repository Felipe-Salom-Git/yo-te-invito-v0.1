'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageLoader } from '@/components';
import { PortalLayoutShell } from '@/components/portal/PortalLayoutShell';

/** Portal V2 polish: mobile nav, EmptyState/QueryError, ticket groups, cart UX — see task plan in PR. */
export default function MePortalLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <PageLoader message="Cargando tu espacio…" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
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
