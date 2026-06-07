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

type AdminEventsTableProps = {
  events: AdminEventListItem[];
};

export function AdminEventsTable({ events }: AdminEventsTableProps) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-bg-muted/60 text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Contenido</th>
            <th className="px-4 py-3 font-medium">Categoría</th>
            <th className="px-4 py-3 font-medium">Productora</th>
            <th className="px-4 py-3 font-medium">Ciudad</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Inicio</th>
            <th className="px-4 py-3 font-medium">Actualizado</th>
            <th className="px-4 py-3 font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id} className="border-b border-border/50">
              <td className="max-w-[220px] px-4 py-3">
                <p className="truncate font-medium text-text" title={ev.title}>
                  {ev.title}
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Alta {formatDt(ev.createdAt)}
                </p>
              </td>
              <td className="px-4 py-3 text-text-muted">
                <span>{getCategoryLabel(ev.category ?? undefined)}</span>
                {ev.category === 'hotel' ? (
                  <span className="mt-1 block text-[10px] uppercase tracking-wide text-text-muted">
                    Próximamente
                  </span>
                ) : null}
                {ev.subcategoryName ? (
                  <span className="mt-0.5 block text-xs">{ev.subcategoryName}</span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-text-muted">
                {ev.producerName ?? '—'}
              </td>
              <td className="px-4 py-3 text-text-muted">{ev.city ?? '—'}</td>
              <td className="px-4 py-3">
                <AdminProducerStatusBadge status={ev.status} />
                {ev.publishedAt ? (
                  <p className="mt-1 text-[10px] text-text-muted">
                    Pub. {formatDt(ev.publishedAt)}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                {formatDt(ev.startAt)}
              </td>
              <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                {formatDt(ev.updatedAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-2">
                  <AdminEventReviewLink event={ev} />
                  <AdminEventLifecycleActions eventId={ev.id} status={ev.status} compact />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
