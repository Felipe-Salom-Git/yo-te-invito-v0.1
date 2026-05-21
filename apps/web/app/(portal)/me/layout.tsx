'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { PortalSidebar } from '@/components/layout/PortalSidebar';

const NAV = [
  { href: '/me', label: 'Inicio' },
  { href: '/me/tickets', label: 'Mis tickets' },
  { href: '/me/orders', label: 'Mis pedidos' },
  { href: '/me/cart', label: 'Carrito' },
  { href: '/me/preferences', label: 'Preferencias' },
  { href: '/me/following', label: 'Productoras' },
  { href: '/me/recommendations', label: 'Recomendados' },
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
        <p className="text-text-muted">Cargando…</p>
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
