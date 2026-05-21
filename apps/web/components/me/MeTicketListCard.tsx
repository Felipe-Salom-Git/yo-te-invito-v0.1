'use client';

import Link from 'next/link';
import { Button } from '@/components';
import { StatusBadge } from '@/components/domain/StatusBadge';
import type { Ticket } from '@/repositories/interfaces';

type Props = {
  ticket: Ticket;
  eventTitle: string;
  onSimulateScan?: () => void;
  isScanning?: boolean;
};

/** Mobile-friendly ticket row for /me/tickets. */
export function MeTicketListCard({
  ticket,
  eventTitle,
  onSimulateScan,
  isScanning,
}: Props) {
  const startRaw = ticket.eventStartAt as string | undefined;
  const when = startRaw
    ? new Date(startRaw).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
    : null;

  return (
    <article className="rounded-lg border border-border bg-bg-muted p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text">{eventTitle}</p>
          {ticket.ticketTypeName ? (
            <p className="text-xs text-text-muted">{ticket.ticketTypeName}</p>
          ) : null}
          {when && <p className="mt-1 text-xs text-text-muted">{when}</p>}
          <p className="mt-2 text-xs text-text-muted break-all">ID: {ticket.id}</p>
        </div>
        <StatusBadge status={ticket.status} kind="ticket" className="self-start shrink-0" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={`/me/tickets/${ticket.id}`}
          className="inline-flex rounded border border-border px-3 py-1.5 text-sm hover:bg-border transition-colors"
        >
          Ver detalle
        </Link>
        {ticket.status === 'VALID' && onSimulateScan && (
          <Button size="sm" variant="outline" onClick={onSimulateScan} disabled={isScanning}>
            {isScanning ? '…' : 'Simular scan'}
          </Button>
        )}
      </div>
    </article>
  );
}
