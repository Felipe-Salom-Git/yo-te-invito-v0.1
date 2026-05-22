'use client';

import type { CourtesyGrantSummary, TicketTypeResponse } from '@/repositories/interfaces';
import { Badge, Button } from '@/components';
import {
  COURTESY_MODE_LABELS,
  type CourtesyMode,
} from '@/lib/producer/courtesy.utils';

type Props = {
  grants: CourtesyGrantSummary[];
  ticketTypesById: Map<string, TicketTypeResponse>;
  onCreateClick: () => void;
};

export function ProducerCourtesyGrantsList({
  grants,
  ticketTypesById,
  onCreateClick,
}: Props) {
  if (!grants.length) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-bg-muted/30 py-12 text-center">
        <p className="text-text-muted">Todavía no otorgaste cortesías para este evento.</p>
        <p className="mt-2 text-sm text-text-muted">
          Emití entradas gratuitas con QR para prensa, invitados o equipo.
        </p>
        <Button type="button" className="mt-4" onClick={onCreateClick}>
          Crear cortesía
        </Button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {grants.map((g) => {
        const mode = g.mode as CourtesyMode;
        const typeName = g.ticketTypeId
          ? ticketTypesById.get(g.ticketTypeId)?.name ?? g.ticketTypeId
          : null;
        return (
          <li
            key={g.id}
            className="rounded-xl border border-border bg-bg-muted/30 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-text">
                    {g.issued} entrada{g.issued === 1 ? '' : 's'}
                  </span>
                  <Badge variant="muted">
                    {COURTESY_MODE_LABELS[mode] ?? g.mode}
                  </Badge>
                </div>
                {typeName ? (
                  <p className="mt-1 text-sm text-text-muted">
                    Tipo: <span className="text-text">{typeName}</span>
                  </p>
                ) : null}
                {g.note ? (
                  <p className="mt-1 text-sm text-text-muted">
                    Nota: <span className="text-text">{g.note}</span>
                  </p>
                ) : null}
              </div>
              <div className="text-right text-sm">
                <p className="text-xs text-text-muted">Emitidas</p>
                <p className="font-medium text-text">
                  {g.issued} / {g.quantity}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {new Date(g.createdAt).toLocaleString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Estado de uso: cada ticket queda <span className="text-text">válido</span> hasta que el
              scanner lo marque como usado. Este listado no muestra escaneos individuales.
            </p>
          </li>
        );
      })}
    </ul>
  );
}
