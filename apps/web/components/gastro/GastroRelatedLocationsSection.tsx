'use client';

import Link from 'next/link';
import type { EventSummary } from '@/repositories/interfaces';
import { getContentDetailHref } from '@/lib/home/contentRoutes';

type GastroRelatedLocationsSectionProps = {
  locations: EventSummary[];
  currentEventId: string;
  tenantId: string;
  title?: string;
};

export function GastroRelatedLocationsSection({
  locations,
  currentEventId,
  tenantId,
  title = 'Restaurantes que también te pueden gustar',
}: GastroRelatedLocationsSectionProps) {
  const filtered = locations.filter((e) => e.id !== currentEventId).slice(0, 8);
  if (filtered.length === 0) return null;

  return (
    <section className="mt-12">
      <h2 className="text-xl font-semibold text-text">{title}</h2>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((ev) => (
          <Link
            key={ev.id}
            href={getContentDetailHref(ev, tenantId)}
            className="group block overflow-hidden rounded-lg border border-border/80 bg-bg-muted transition-colors hover:border-accent/50"
          >
            <div className="aspect-[4/3] overflow-hidden bg-bg-muted">
              {ev.coverImageUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={ev.coverImageUrl}
                  alt={ev.title}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-amber-900/20 text-3xl opacity-60">
                  🍽️
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="line-clamp-2 text-sm font-medium text-text">{ev.title}</p>
              {ev.city && <p className="mt-0.5 text-xs text-text-muted">{ev.city}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
