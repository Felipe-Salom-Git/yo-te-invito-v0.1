'use client';

import Link from 'next/link';

const LINKS = [
  { href: '/me/cart', label: 'Mi Carro', description: 'Entradas y checkout' },
  { href: '/me/tickets', label: 'Mis tickets', description: 'QR y próximos eventos' },
  {
    href: '/me/preferences',
    label: 'Favoritos y preferencias',
    description: 'Gustos, ciudad y alertas',
  },
  { href: '/me/notifications', label: 'Notificaciones', description: 'Novedades y avisos' },
] as const;

export function MeDashboardQuickLinks() {
  return (
    <section className="mt-8" aria-labelledby="me-quick-links-heading">
      <h3 id="me-quick-links-heading" className="text-lg font-semibold text-text">
        Accesos rápidos
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg border border-border bg-bg-muted p-4 transition-colors hover:border-accent/50"
          >
            <p className="font-medium text-text">{item.label}</p>
            <p className="mt-0.5 text-sm text-text-muted">{item.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
