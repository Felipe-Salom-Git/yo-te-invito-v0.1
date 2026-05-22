'use client';

import Link from 'next/link';
import type { ProducerDashboardMetrics } from '@/repositories/interfaces';

type Props = {
  topEvents: ProducerDashboardMetrics['topEvents'];
};

export function ProducerDashboardTopEvents({ topEvents }: Props) {
  if (topEvents.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="producer-top-events-heading">
      <h2 id="producer-top-events-heading" className="text-lg font-semibold text-text">
        Eventos con mayor interés
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Ordenados por vistas, favoritos y usuarios que marcaron &quot;lo espero&quot;.
      </p>
      <ul className="mt-3 min-w-0 space-y-2">
        {topEvents.map((ev) => (
          <li key={ev.id}>
            <Link
              href={`/producer/events/${ev.id}`}
              className="block rounded-xl border border-border/80 bg-bg-muted/40 p-4 transition-colors hover:border-accent/40"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="min-w-0 font-medium text-text truncate">{ev.title}</p>
                {ev.interestRate != null ? (
                  <span className="shrink-0 text-xs font-medium text-accent">
                    {ev.interestRate}% interés
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                <span>{ev.viewCount} vistas</span>
                <span>{ev.favoriteCount} favoritos</span>
                <span>{ev.expectedCount} lo esperan</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
