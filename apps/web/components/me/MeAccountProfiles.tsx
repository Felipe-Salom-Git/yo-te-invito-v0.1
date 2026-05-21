'use client';

import Link from 'next/link';
import type { MeAvailableProfiles } from '@/repositories/interfaces';

const PORTAL_LINKS: Array<{
  key: keyof MeAvailableProfiles;
  label: string;
  href: string;
  applyHref?: string;
}> = [
  { key: 'producer', label: 'Productor', href: '/producer', applyHref: '/cuenta/solicitar-productor' },
  { key: 'gastro', label: 'Gastronomía', href: '/gastro', applyHref: '/cuenta/solicitar-gastro' },
  { key: 'hotel', label: 'Hotel', href: '/hotel', applyHref: '/cuenta/solicitar-hotel' },
  { key: 'referrer', label: 'Referidor', href: '/referrer', applyHref: '/cuenta/solicitar-referrer' },
];

export function MeAccountProfiles({ profiles }: { profiles?: MeAvailableProfiles }) {
  if (!profiles) return null;

  return (
    <section className="mt-10 rounded-lg border border-border p-4">
      <h3 className="font-medium text-text">Perfiles y portales</h3>
      <p className="mt-1 text-sm text-text-muted">
        Accedé a los portales comerciales asociados a tu cuenta.
      </p>
      <ul className="mt-4 space-y-3">
        {PORTAL_LINKS.map(({ key, label, href, applyHref }) => {
          const block = profiles[key];
          if (!block) return null;
          const active = block.profiles.filter((p) => p.status === 'ACTIVE');
          return (
            <li key={key} className="rounded border border-border/80 bg-bg-muted/50 px-3 py-3">
              <p className="text-sm font-medium text-text">{label}</p>
              {block.hasAccess && active.length > 0 ? (
                <ul className="mt-2 space-y-1">
                  {active.map((p) => (
                    <li key={p.id}>
                      <Link href={href} className="text-sm text-accent hover:underline">
                        {p.displayName} → portal
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : applyHref ? (
                <Link href={applyHref} className="mt-2 inline-block text-sm text-accent hover:underline">
                  Solicitar perfil {label.toLowerCase()}
                </Link>
              ) : (
                <p className="mt-1 text-xs text-text-muted">Sin acceso activo</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
