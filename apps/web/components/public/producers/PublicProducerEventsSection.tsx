'use client';

import { useMemo, useState } from 'react';
import type { PublicProducerEventSummary } from '@/repositories/interfaces';
import {
  PublicProducerEventFilters,
  type ProducerEventFilter,
} from './PublicProducerEventFilters';
import { PublicProducerEventCard } from './PublicProducerEventCard';

type Props = {
  events: PublicProducerEventSummary[];
  tenantId: string;
};

function filterEvents(
  events: PublicProducerEventSummary[],
  filter: ProducerEventFilter,
): PublicProducerEventSummary[] {
  const now = Date.now();
  return events.filter((ev) => {
    if (filter === 'ticketed') return ev.hasTicketing;
    if (filter === 'publicity') return ev.eventMode === 'PUBLICITY_ONLY';
    if (filter === 'upcoming') return new Date(ev.startAt).getTime() >= now;
    return true;
  });
}

export function PublicProducerEventsSection({ events, tenantId }: Props) {
  const [filter, setFilter] = useState<ProducerEventFilter>('all');
  const filtered = useMemo(() => filterEvents(events, filter), [events, filter]);

  return (
    <section id="producer-events" className="mt-12 scroll-mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-text">Eventos</h2>
        <PublicProducerEventFilters value={filter} onChange={setFilter} />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-text-muted">
          {events.length === 0
            ? 'Esta productora aún no tiene eventos públicos.'
            : 'No hay eventos con este filtro.'}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {filtered.map((ev) => (
            <li key={ev.id}>
              <PublicProducerEventCard event={ev} tenantId={tenantId} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
