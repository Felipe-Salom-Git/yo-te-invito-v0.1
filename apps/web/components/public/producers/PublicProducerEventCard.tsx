'use client';

import Link from 'next/link';
import type { PublicProducerEventSummary } from '@/repositories/interfaces';
import { EventModeBadge } from '@/components/producer/events/EventModeBadge';

type Props = {
  event: PublicProducerEventSummary;
  tenantId: string;
};

export function PublicProducerEventCard({ event, tenantId }: Props) {
  const href = `/events/${event.id}?tenantId=${encodeURIComponent(tenantId)}`;
  const dateLabel = new Date(event.startAt).toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link
      href={href}
      className="group flex gap-4 overflow-hidden rounded-xl border border-border bg-bg-muted p-3 transition-colors hover:border-accent"
    >
      <div className="h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-bg">
        {event.coverImageUrl ? (
          <img
            src={event.coverImageUrl}
            alt=""
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
            Sin imagen
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold text-text line-clamp-2">{event.title}</h3>
          <EventModeBadge mode={event.eventMode} hasActiveTicketing={event.hasTicketing} />
        </div>
        <p className="mt-1 text-sm text-text-muted">
          {event.city ?? event.venueName ?? '—'} · {dateLabel}
        </p>
      </div>
    </Link>
  );
}
