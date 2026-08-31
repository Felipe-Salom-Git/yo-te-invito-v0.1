'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/admin/liquidaciones', label: 'Liquidaciones', match: 'settlements' as const },
  { href: '/admin/liquidaciones/acuerdos', label: 'Acuerdos', match: 'acuerdos' as const },
  { href: '/admin/liquidaciones/creditos', label: 'Créditos', match: 'creditos' as const },
];

function isActive(pathname: string | null, match: (typeof ITEMS)[number]['match']): boolean {
  if (!pathname) return false;
  if (match === 'acuerdos') return pathname.startsWith('/admin/liquidaciones/acuerdos');
  if (match === 'creditos') return pathname.startsWith('/admin/liquidaciones/creditos');
  return (
    pathname === '/admin/liquidaciones' ||
    /^\/admin\/liquidaciones\/[^/]+$/.test(pathname)
  );
}

export function LiquidacionesSubnav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded px-3 py-1.5 text-sm ${
            isActive(pathname, item.match)
              ? 'bg-accent/15 font-medium text-accent'
              : 'text-text-muted hover:bg-bg-muted hover:text-text'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
