'use client';

import Link from 'next/link';
import type { AdminGastroLocationListItem } from '@/repositories/interfaces';
import { AdminProducerStatusBadge } from '@/components/admin/producers/AdminProducerStatusBadge';
import { Button } from '@/components';

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function locationLine(loc: AdminGastroLocationListItem): string {
  const parts = [loc.city, loc.province].filter(Boolean);
  return parts.length ? parts.join(', ') : '—';
}

function ownerLine(loc: AdminGastroLocationListItem): string {
  if (loc.owner.userId) {
    return loc.owner.name || loc.owner.email || 'Dueño asignado';
  }
  return 'Operado por admin';
}

type Props = {
  locations: AdminGastroLocationListItem[];
  statusPendingId: string | null;
  onToggleStatus: (loc: AdminGastroLocationListItem) => void;
};

export function AdminGastroLocationsTable({
  locations,
  statusPendingId,
  onToggleStatus,
}: Props) {
  if (locations.length === 0) return null;

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-bg-muted/60 text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Local</th>
            <th className="px-4 py-3 font-medium">Ubicación</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Dueño</th>
            <th className="px-4 py-3 font-medium">Ficha pública</th>
            <th className="px-4 py-3 font-medium">Descuentos</th>
            <th className="px-4 py-3 font-medium">Actualizado</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((loc) => {
            const isActive = loc.status === 'active';
            const isSuspended = loc.status === 'suspended';
            const hasPublic = Boolean(loc.publicEventId);
            const showPublicFicha = isActive && hasPublic;
            return (
              <tr key={loc.id} className="border-b border-border/50 align-top">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/gastronomicos/${loc.id}`}
                    className="font-medium text-text hover:text-accent"
                  >
                    {loc.displayName}
                  </Link>
                  {loc.contactEmail ? (
                    <p className="mt-0.5 text-xs text-text-muted">{loc.contactEmail}</p>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-text-muted">{locationLine(loc)}</td>
                <td className="px-4 py-3">
                  <AdminProducerStatusBadge status={loc.status} />
                </td>
                <td className="max-w-[160px] px-4 py-3 text-text-muted">{ownerLine(loc)}</td>
                <td className="px-4 py-3">
                  {hasPublic ? (
                    <span className="inline-flex rounded border border-accent-muted bg-accent-surface/50 px-2 py-0.5 text-xs text-accent-soft">
                      Sincronizada
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">Sin publicar</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {loc.discountsCount} total · {loc.pendingDiscountsCount} pend. ·{' '}
                  {loc.activeDiscountsCount} activos
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                  {formatDt(loc.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <Link
                      href={`/admin/gastronomicos/${loc.id}`}
                      className="text-xs text-accent hover:underline"
                    >
                      Ver detalle
                    </Link>
                    <Link
                      href={`/admin/gastronomicos/${loc.id}/editar`}
                      className="text-xs text-accent hover:underline"
                    >
                      Editar
                    </Link>
                    {showPublicFicha ? (
                      <Link
                        href={`/gastronomicos/${loc.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-muted hover:text-accent"
                      >
                        Ver ficha pública
                      </Link>
                    ) : null}
                    {(isActive || isSuspended) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="!justify-start !px-0 text-xs"
                        disabled={statusPendingId === loc.id}
                        onClick={() => onToggleStatus(loc)}
                      >
                        {statusPendingId === loc.id
                          ? '…'
                          : isActive
                            ? 'Suspender'
                            : 'Activar'}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
