'use client';

import Link from 'next/link';
import type { AdminDashboardPendingEvent } from '@/repositories/interfaces';
import { getCategoryLabel } from '@/lib/home/contentRoutes';
import { AdminProducerStatusBadge } from '@/components/admin/producers/AdminProducerStatusBadge';
import { Button, EmptyState } from '@/components';
import { adminEventReviewHref } from '@/components/admin/events/AdminEventReviewLink';

type AdminPendingEventsQueueProps = {
  events: AdminDashboardPendingEvent[];
  isLoading?: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function AdminPendingEventsQueue({ events, isLoading }: AdminPendingEventsQueueProps) {
  if (isLoading) {
    return (
      <div className="mt-4 space-y-3" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border/60 bg-bg-muted/40"
          />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState
          title="Sin eventos pendientes"
          description="Cuando una productora envíe un evento a revisión, va a aparecer acá."
        />
      </div>
    );
  }

  return (
    <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/80 bg-bg-muted/30">
      {events.map((ev) => (
        <li
          key={ev.id}
          className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-text">{ev.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
              <span>{getCategoryLabel(ev.category ?? undefined)}</span>
              {ev.producerName ? <span>{ev.producerName}</span> : null}
              {ev.city ? <span>{ev.city}</span> : null}
              <span>Creado {formatDate(ev.createdAt)}</span>
              <span>Inicio {formatDate(ev.startAt)}</span>
            </div>
            <div className="mt-2">
              <AdminProducerStatusBadge status={ev.status} />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href={adminEventReviewHref(ev)}>
              <Button size="sm">Revisar</Button>
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
