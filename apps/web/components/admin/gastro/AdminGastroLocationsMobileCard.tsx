'use client';

import Link from 'next/link';
import type { AdminGastroLocationListItem } from '@/repositories/interfaces';
import { AdminProducerStatusBadge } from '@/components/admin/producers/AdminProducerStatusBadge';
import { Button } from '@/components';

function locationLine(loc: AdminGastroLocationListItem): string {
  const parts = [loc.city, loc.province].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Sin ubicación';
}

type Props = {
  location: AdminGastroLocationListItem;
  statusPending: boolean;
  onToggleStatus: () => void;
};

export function AdminGastroLocationsMobileCard({
  location: loc,
  statusPending,
  onToggleStatus,
}: Props) {
  const isActive = loc.status === 'active';
  const isSuspended = loc.status === 'suspended';
  const hasPublic = Boolean(loc.publicEventId);
  const showPublicFicha = isActive && hasPublic;

  return (
    <article className="rounded-xl border border-border/80 bg-bg-muted/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/admin/gastronomicos/${loc.id}`}
            className="font-medium text-text hover:text-accent"
          >
            {loc.displayName}
          </Link>
          <p className="mt-0.5 text-xs text-text-muted">{locationLine(loc)}</p>
        </div>
        <AdminProducerStatusBadge status={loc.status} />
      </div>

      <dl className="mt-3 space-y-1 text-xs text-text-muted">
        <div>
          <dt className="inline font-medium">Dueño: </dt>
          <dd className="inline">
            {loc.owner.userId
              ? loc.owner.name || loc.owner.email || 'Asignado'
              : 'Operado por admin'}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Ficha pública: </dt>
          <dd className="inline">{hasPublic ? 'Sincronizada' : 'Sin publicar'}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Descuentos: </dt>
          <dd className="inline">
            {loc.discountsCount} · {loc.pendingDiscountsCount} pend. · {loc.activeDiscountsCount}{' '}
            activos
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/admin/gastronomicos/${loc.id}/editar`}
          className="rounded border border-border px-3 py-1.5 text-xs text-text hover:border-accent"
        >
          Editar
        </Link>
        <Link
          href={`/admin/gastronomicos/${loc.id}`}
          className="rounded border border-border px-3 py-1.5 text-xs text-text hover:border-accent"
        >
          Detalle
        </Link>
        {showPublicFicha ? (
          <Link
            href={`/gastronomicos/${loc.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-border px-3 py-1.5 text-xs text-text-muted hover:border-accent"
          >
            Ficha pública
          </Link>
        ) : null}
        {(isActive || isSuspended) && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={statusPending}
            onClick={onToggleStatus}
          >
            {statusPending ? '…' : isActive ? 'Suspender' : 'Activar'}
          </Button>
        )}
      </div>
    </article>
  );
}
