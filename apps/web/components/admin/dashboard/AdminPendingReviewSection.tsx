'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  AdminDashboardPendingEvent,
  AdminDashboardPendingGastroDiscount,
} from '@/repositories/interfaces';
import { EmptyState } from '@/components';
import { AdminPendingEventsQueue } from './AdminPendingEventsQueue';

type PendingTab = 'approval' | 'drafts' | 'gastro';

type Props = {
  pendingEvents: AdminDashboardPendingEvent[];
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

function gastroPendingKindLabel(
  d: AdminDashboardPendingGastroDiscount,
): string {
  if (d.reviewKind === 'EDIT') return 'Edición pendiente';
  if (d.reviewKind === 'NEW') return 'Nuevo descuento pendiente';
  return GASTRO_DISCOUNT_STATUS_LABEL[d.status] ?? d.status;
}

function pickDefaultTab(
  approvalCount: number,
  draftCount: number,
  gastroCount: number,
): PendingTab {
  if (approvalCount > 0) return 'approval';
  if (draftCount > 0) return 'drafts';
  if (gastroCount > 0) return 'gastro';
  return 'approval';
}

function tabChipClass(active: boolean): string {
  return [
    'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg',
    active
      ? 'border-accent bg-accent/15 text-accent'
      : 'border-border/80 bg-bg-muted/40 text-text-muted hover:border-accent/40 hover:text-text',
  ].join(' ');
}

function GastroDiscountsPendingList({
  items,
}: {
  items: AdminDashboardPendingGastroDiscount[];
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Sin descuentos pendientes"
        description="Los descuentos en revisión o negociación de comisión van a aparecer acá."
      />
    );
  }

  return (
    <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/80 bg-bg-muted/30">
      {items.map((d) => (
        <li
          key={d.id}
          className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-text">{d.title}</p>
            <p className="mt-1 text-xs text-text-muted">
              {d.profileName ?? 'Local gastro'} · {gastroPendingKindLabel(d)} · Creado{' '}
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
  );
}

/**
 * Single dashboard module for all pending ops — approval queue, drafts, gastro discounts.
 * Does not drop any data from the previous dual-section layout.
 */
export function AdminPendingReviewSection({
  pendingEvents,
  draftEvents,
  pendingGastroDiscounts,
  isLoading,
}: Props) {
  const approvalCount = pendingEvents.length;
  const draftCount = draftEvents.length;
  const gastroCount = pendingGastroDiscounts.length;
  const totalCount = approvalCount + draftCount + gastroCount;

  const defaultTab = pickDefaultTab(approvalCount, draftCount, gastroCount);
  const [tabOverride, setTabOverride] = useState<PendingTab | null>(null);
  const tab = tabOverride ?? defaultTab;

  const tabs = useMemo(
    () =>
      [
        {
          id: 'approval' as const,
          label: 'Eventos para aprobar',
          count: approvalCount,
          href: '/admin/eventos?view=pending',
          hrefLabel: 'Ver todos los pendientes →',
          description: 'Eventos enviados a revisión. Aprobá o rechazá desde la ficha.',
        },
        {
          id: 'drafts' as const,
          label: 'Borradores',
          count: draftCount,
          href: '/admin/eventos?view=draft',
          hrefLabel: 'Ver borradores →',
          description: 'Publicaciones que aún no fueron enviadas a revisión.',
        },
        {
          id: 'gastro' as const,
          label: 'Descuentos gastro',
          count: gastroCount,
          href: '/admin/gastronomicos?hasPendingDiscounts=1',
          hrefLabel: 'Ver locales →',
          description: 'Descuentos nuevos y ediciones pendientes de revisión.',
        },
      ] as const,
    [approvalCount, draftCount, gastroCount],
  );

  const active = tabs.find((t) => t.id === tab) ?? tabs[0];

  return (
    <section id="pendientes-revision" className="mt-10 scroll-mt-24" aria-labelledby="pendientes-revision-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="pendientes-revision-title" className="text-lg font-semibold text-text">
            Pendientes de revisión
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            {isLoading
              ? 'Cargando operaciones pendientes…'
              : totalCount > 0
                ? `${totalCount} operación${totalCount === 1 ? '' : 'es'} pendiente${totalCount === 1 ? '' : 's'} en total.`
                : 'No hay operaciones pendientes en este momento.'}
          </p>
        </div>
        <Link href={active.href} className="text-sm font-medium text-accent hover:underline">
          {active.hrefLabel}
        </Link>
      </div>

      <div
        className="mt-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Tipos de pendientes"
      >
        {tabs.map((t) => {
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`pending-tab-${t.id}`}
              aria-controls={`pending-panel-${t.id}`}
              className={tabChipClass(selected)}
              onClick={() => setTabOverride(t.id)}
            >
              {t.label}
              <span className="ml-1.5 tabular-nums text-xs opacity-80">({t.count})</span>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-sm text-text-muted">{active.description}</p>

      <div
        role="tabpanel"
        id={`pending-panel-${active.id}`}
        aria-labelledby={`pending-tab-${active.id}`}
      >
        {active.id === 'approval' ? (
          <AdminPendingEventsQueue
            events={pendingEvents}
            isLoading={isLoading}
            emptyTitle="Sin eventos para aprobar"
            emptyDescription="Cuando una productora envíe un evento a revisión, va a aparecer acá."
          />
        ) : null}

        {active.id === 'drafts' ? (
          <AdminPendingEventsQueue
            events={draftEvents}
            isLoading={isLoading}
            emptyTitle="Sin eventos en borrador"
            emptyDescription="Los borradores pendientes de envío a revisión van a aparecer acá."
          />
        ) : null}

        {active.id === 'gastro' ? (
          isLoading ? (
            <div className="mt-4 h-24 animate-pulse rounded-xl border border-border/60 bg-bg-muted/40" />
          ) : (
            <GastroDiscountsPendingList items={pendingGastroDiscounts} />
          )
        ) : null}
      </div>
    </section>
  );
}
