'use client';

import Link from 'next/link';
import type { MeAvailableProfiles } from '@/repositories/interfaces';

const PORTAL_LINKS: Array<{
  key: keyof MeAvailableProfiles;
  label: string;
  href: string;
}> = [
  { key: 'producer', label: 'Productora', href: '/producer' },
  { key: 'gastro', label: 'Gastronomía', href: '/gastro' },
  { key: 'hotel', label: 'Hotel', href: '/hotel' },
  { key: 'referrer', label: 'Referido', href: '/referrer' },
];

export function MeAccountProfiles({ profiles }: { profiles?: MeAvailableProfiles }) {
  if (!profiles) return null;

  const activePortals = PORTAL_LINKS.filter(({ key }) => {
    const block = profiles[key];
    if (!block?.hasAccess) return false;
    return block.profiles.some((p) => p.status === 'ACTIVE');
  });

  if (activePortals.length === 0) return null;

  return (
    <section className="mt-10 rounded-lg border border-border p-4">
      <h3 className="font-medium text-text">Portales comerciales</h3>
      <p className="mt-1 text-sm text-text-muted">
        Accedé a los paneles asociados a tu cuenta.
      </p>
      <ul className="mt-4 space-y-3">
        {activePortals.map(({ key, label, href }) => {
          const block = profiles[key];
          if (!block) return null;
          const active = block.profiles.filter((p) => p.status === 'ACTIVE');
          return (
            <li key={key} className="rounded border border-border/80 bg-bg-muted/50 px-3 py-3">
              <p className="text-sm font-medium text-text">{label}</p>
              <ul className="mt-2 space-y-1">
                {active.map((p) => (
                  <li key={p.id}>
                    <Link href={href} className="text-sm text-accent hover:underline">
                      {p.displayName} → ir al panel
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
