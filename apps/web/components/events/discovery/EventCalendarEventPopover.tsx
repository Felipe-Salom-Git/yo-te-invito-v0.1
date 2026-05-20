'use client';

import Link from 'next/link';
import type { EventSummary } from '@/repositories/interfaces';
import { getContentDetailHref } from '@/lib/home/contentRoutes';
import { formatEventDateTime } from '@/lib/events/discovery/groupEventsByMonth';
import { EventTicketingBadge } from './EventTicketingBadge';

export function EventCalendarEventPopover({
  event,
  onClose,
}: {
  event: EventSummary;
  onClose: () => void;
}) {
  const { date, time } = formatEventDateTime(event.startAt);
  const hasTicketing = event.hasTicketing ?? event.isTicketingEnabled ?? false;
  const location = [event.venueName, event.city].filter(Boolean).join(' · ') || 'Ubicación a confirmar';

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-xl border border-white/15 bg-bg-muted shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {event.coverImageUrl ? (
          <div className="relative h-32 w-full bg-black/40">
            <img src={event.coverImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="flex h-24 items-center justify-center bg-white/5 text-sm text-white/30">
            Sin imagen
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold leading-tight text-text">{event.title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-xl leading-none text-text-muted hover:text-text"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>

          <p className="mt-2 text-sm text-text-muted">
            {date} · {time}
          </p>
          <p className="mt-1 text-sm text-text-muted">{location}</p>

          <div className="mt-3">
            <EventTicketingBadge hasTicketing={hasTicketing} />
          </div>

          {event.summary?.trim() ? (
            <p className="mt-3 line-clamp-3 text-sm text-text-muted">{event.summary.trim()}</p>
          ) : event.description?.trim() ? (
            <p className="mt-3 line-clamp-3 text-sm text-text-muted">{event.description.trim()}</p>
          ) : null}

          <Link
            href={getContentDetailHref({ id: event.id, category: event.category ?? 'event' })}
            className="mt-5 block w-full rounded-lg bg-accent py-2.5 text-center text-sm font-semibold text-bg hover:opacity-90"
          >
            Ir a la página
          </Link>
        </div>
      </div>
    </div>
  );
}
