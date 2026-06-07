'use client';

import type { AdminEventListItem } from '@/repositories/interfaces';
import { getCategoryLabel } from '@/lib/home/contentRoutes';
import { AdminProducerStatusBadge } from '@/components/admin/producers/AdminProducerStatusBadge';
import { AdminEventReviewLink } from './AdminEventReviewLink';
import { AdminEventLifecycleActions } from '@/components/admin/AdminEventLifecycleActions';

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

type AdminEventsMobileCardProps = {
  event: AdminEventListItem;
};

export function AdminEventsMobileCard({ event }: AdminEventsMobileCardProps) {
  const isHotel = event.category === 'hotel';

  return (
    <article className="rounded-xl border border-border/80 bg-bg-muted/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 font-medium text-text">{event.title}</h3>
        <AdminProducerStatusBadge status={event.status} />
      </div>
      <dl className="mt-3 space-y-1 text-xs text-text-muted">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-medium text-text-muted">Categoría</dt>
          <dd>
            {getCategoryLabel(event.category ?? undefined)}
            {isHotel ? (
              <span className="ml-1 rounded border border-dashed border-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                Próximamente
              </span>
            ) : null}
          </dd>
        </div>
        {event.subcategoryName ? (
          <div>
            <dt className="inline font-medium">Subcategoría: </dt>
            <dd className="inline">{event.subcategoryName}</dd>
          </div>
        ) : null}
        {event.producerName ? (
          <div>
            <dt className="inline font-medium">Productora: </dt>
            <dd className="inline">{event.producerName}</dd>
          </div>
        ) : null}
        {event.city ? (
          <div>
            <dt className="inline font-medium">Ciudad: </dt>
            <dd className="inline">{event.city}</dd>
          </div>
        ) : null}
        <div>
          <dt className="inline font-medium">Inicio: </dt>
          <dd className="inline">{formatDt(event.startAt)}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Creado: </dt>
          <dd className="inline">{formatDt(event.createdAt)}</dd>
        </div>
        {event.publishedAt ? (
          <div>
            <dt className="inline font-medium">Publicado: </dt>
            <dd className="inline">{formatDt(event.publishedAt)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <AdminEventReviewLink event={event} />
        <AdminEventLifecycleActions eventId={event.id} status={event.status} compact />
      </div>
    </article>
  );
}
