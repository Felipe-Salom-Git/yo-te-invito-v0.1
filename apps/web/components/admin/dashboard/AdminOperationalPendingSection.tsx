'use client';

import Link from 'next/link';
import type {
  AdminDashboardPendingEvent,
  AdminDashboardPendingGastroDiscount,
} from '@/repositories/interfaces';
import { AdminPendingEventsQueue } from './AdminPendingEventsQueue';
import { EmptyState } from '@/components';

type Props = {
  draftEvents: AdminDashboardPendingEvent[];
  pendingGastroDiscounts: AdminDashboardPendingGastroDiscount[];
  isLoading?: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

const GASTRO_DISCOUNT_STATUS_LABEL: Record<string, string> = {
  PENDING_REVIEW: 'Pendiente de revisión',
  COMMISSION_NEGOTIATION: 'Negociación comisión',
};

export function AdminOperationalPendingSection({
  draftEvents,
  pendingGastroDiscounts,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="mt-4 h-24 animate-pulse rounded-xl border border-border/60 bg-bg-muted/40" />
    );
  }

  const hasContent = draftEvents.length > 0 || pendingGastroDiscounts.length > 0;
  if (!hasContent) {
    return (
      <EmptyState
        title="Sin borradores operativos"
        description="Los eventos en borrador y descuentos gastro pendientes van a aparecer acá."
      />
    );
  }

  return (
    <div className="mt-4 space-y-8">
      {draftEvents.length > 0 ? (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-text">Eventos en borrador</h3>
              <p className="mt-1 text-sm text-text-muted">
                Publicaciones que aún no fueron enviadas a revisión.
              </p>
            </div>
            <Link href="/admin/eventos?view=draft" className="text-sm font-medium text-accent hover:underline">
              Ver borradores →
            </Link>
          </div>
          <AdminPendingEventsQueue events={draftEvents} />
        </div>
      ) : null}

      {pendingGastroDiscounts.length > 0 ? (
        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-text">Descuentos gastronómicos pendientes</h3>
              <p className="mt-1 text-sm text-text-muted">
                Tickets de descuento en revisión o negociación de comisión.
              </p>
            </div>
            <Link
              href="/admin/gastronomicos?hasPendingDiscounts=1"
              className="text-sm font-medium text-accent hover:underline"
            >
              Ver locales →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/80 bg-bg-muted/30">
            {pendingGastroDiscounts.map((d) => (
              <li
                key={d.id}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{d.title}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {d.profileName ?? 'Local gastro'} ·{' '}
                    {GASTRO_DISCOUNT_STATUS_LABEL[d.status] ?? d.status} · Creado{' '}
                    {formatDate(d.createdAt)}
                  </p>
                </div>
                {d.profileId ? (
                  <Link
                    href={`/admin/gastronomicos/${d.profileId}/descuentos/${d.id}`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    Moderar →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
