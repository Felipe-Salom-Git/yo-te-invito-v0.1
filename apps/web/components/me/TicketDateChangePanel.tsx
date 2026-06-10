'use client';

import { useState } from 'react';
import type { MeTicketDetail } from '@yo-te-invito/shared';
import { Button, useToast } from '@/components';
import {
  useTicketDateChangeMutations,
  useTicketDateChangeOptions,
} from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';
import {
  labelDateChangeReason,
  TICKET_DATE_CHANGE_STATUS_LABELS,
} from '@/lib/me/ticket-date-change-labels';

type Props = {
  ticket: MeTicketDetail;
};

function formatOccurrence(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function TicketDateChangePanel({ ticket }: Props) {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState('');
  const { data: options, isLoading: optionsLoading } = useTicketDateChangeOptions(
    ticket.ticketId,
    open,
  );
  const { create } = useTicketDateChangeMutations();

  const canShow = ticket.canChangeDate === true;
  const history = ticket.dateChangeHistory ?? [];
  const pending = history.find((h) => h.status === 'PENDING');

  if (!canShow && !pending && history.length === 0) {
    return null;
  }

  const blockReason =
    !canShow && options?.reasons?.[0]
      ? labelDateChangeReason(options.reasons[0])
      : null;

  const handleSubmit = () => {
    if (!selectedOccurrenceId) {
      addToast('Elegí una fecha', 'error');
      return;
    }
    create.mutate(
      { ticketId: ticket.ticketId, body: { toOccurrenceId: selectedOccurrenceId } },
      {
        onSuccess: (res) => {
          if (res.autoApproved || res.status === 'APPLIED') {
            addToast('¡Listo! Tu entrada quedó con la nueva fecha.', 'success');
          } else {
            addToast('Solicitud enviada. La productora la revisará.', 'success');
          }
          setOpen(false);
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  return (
    <section className="w-full max-w-sm rounded-lg border border-border p-4">
      <h3 className="font-medium text-text">Cambiar fecha</h3>
      <p className="mt-1 text-sm text-text-muted">
        Solo para eventos con varias fechas. Sin costo adicional en esta versión.
      </p>

      {ticket.event.occurrenceStartAt && (
        <p className="mt-3 text-sm text-text">
          Fecha actual:{' '}
          <strong>{formatOccurrence(ticket.event.occurrenceStartAt)}</strong>
        </p>
      )}

      {pending && (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-text">
          {TICKET_DATE_CHANGE_STATUS_LABELS.PENDING}: solicitaste cambiar a{' '}
          {formatOccurrence(pending.toOccurrenceStartAt)}.
        </p>
      )}

      {blockReason && !open && !canShow && (
        <p className="mt-3 text-sm text-text-muted">{blockReason}</p>
      )}

      {canShow && (
        <div className="mt-4">
          {!open ? (
            <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
              Cambiar fecha
            </Button>
          ) : (
            <div className="space-y-3">
              {optionsLoading && <p className="text-sm text-text-muted">Cargando fechas…</p>}
              {!optionsLoading && options && options.availableOccurrences.length === 0 && (
                <p className="text-sm text-text-muted">No hay otras fechas disponibles con stock.</p>
              )}
              {options?.availableOccurrences.map((occ) => (
                <label
                  key={occ.occurrenceId}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-3 hover:bg-bg-muted/50"
                >
                  <input
                    type="radio"
                    name="date-change-occurrence"
                    className="mt-1"
                    checked={selectedOccurrenceId === occ.occurrenceId}
                    onChange={() => setSelectedOccurrenceId(occ.occurrenceId)}
                  />
                  <span className="text-sm">
                    <span className="font-medium text-text">{formatOccurrence(occ.startAt)}</span>
                    {occ.venueName && (
                      <span className="block text-text-muted">{occ.venueName}</span>
                    )}
                    <span className="block text-xs text-text-muted">
                      {occ.ticketTypeName} · {occ.capacityAvailable} disponibles
                    </span>
                  </span>
                </label>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={create.isPending || !selectedOccurrenceId}
                >
                  {create.isPending ? 'Enviando…' : 'Confirmar cambio'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <h4 className="text-sm font-medium text-text">Historial de cambio de fecha</h4>
          <ul className="mt-2 space-y-2">
            {history.map((item) => (
              <li key={item.id} className="text-xs text-text-muted">
                <span className="font-medium text-text">
                  {TICKET_DATE_CHANGE_STATUS_LABELS[item.status] ?? item.status}
                </span>
                {' · '}
                {formatOccurrence(item.fromOccurrenceStartAt)} →{' '}
                {formatOccurrence(item.toOccurrenceStartAt)}
                {item.rejectReason && (
                  <span className="mt-1 block text-red-400/90">Motivo: {item.rejectReason}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
