'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PageLoader } from '@/components';
import { PortalSidebar } from '@/components/layout/PortalSidebar';

/** Portal V2 polish: mobile nav, EmptyState/QueryError, ticket groups, cart UX — see task plan in PR. */
const NAV = [
  { href: '/me', label: 'Inicio' },
  { href: '/me/tickets', label: 'Mis tickets' },
  { href: '/me/cart', label: 'Mi Carro' },
  { href: '/me/preferences', label: 'Preferencias' },
  { href: '/me/activity', label: 'Actividad' },
  { href: '/me/notifications', label: 'Notificaciones' },
  { href: '/me/account', label: 'Mi cuenta' },
];

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
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver al inicio
      </Link>
      <PortalSidebar items={NAV}>{children}</PortalSidebar>
    </div>
  );
}
