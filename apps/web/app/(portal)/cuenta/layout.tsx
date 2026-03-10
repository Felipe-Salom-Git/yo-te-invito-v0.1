'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/cuenta', label: 'Mi cuenta' },
  { href: '/me/orders', label: 'Mis pedidos' },
  { href: '/me/tickets', label: 'Mis tickets' },
  { href: '/cuenta/preferencias', label: 'Preferencias' },
  { href: '/cuenta/configuracion', label: 'Configuración' },
  { href: '/cuenta/eventos-asistidos', label: 'Eventos asistidos' },
  { href: '/cuenta/eventos-esperados', label: 'Eventos esperados' },
];

export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto max-w-4xl">
      <nav className="mt-[5px] flex flex-wrap gap-2 border-b border-border pb-4">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded px-3 py-1.5 text-sm ${
              pathname === href
                ? 'bg-accent text-bg'
                : 'text-text-muted hover:bg-bg-muted hover:text-text'
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="py-6">{children}</div>
    </div>
  );
}
