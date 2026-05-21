'use client';

import Link from 'next/link';
import { StatusBadge } from '@/components/domain/StatusBadge';
import type { OrderTicketSummary } from '@/repositories/interfaces';

type Props = {
  tickets: OrderTicketSummary[];
};

export function MeOrderTicketsList({ tickets }: Props) {
  if (tickets.length === 0) return null;

  return (
    <section>
      <h3 className="text-base font-semibold text-text">Tickets emitidos</h3>
      <p className="mt-1 text-sm text-text-muted">
        Cada entrada tiene su propio código QR en el detalle del ticket.
      </p>
      <ul className="mt-4 space-y-3">
        {tickets.map((t) => (
          <li
            key={t.id}
            className="flex flex-col gap-3 rounded-lg border border-border bg-bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-text">
                {t.ticketTypeName ?? 'Entrada'}
              </p>
              <p className="text-xs text-text-muted break-all">ID: {t.id}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={t.status} kind="ticket" />
              <Link
                href={`/me/tickets/${t.id}`}
                className="inline-flex rounded border border-border px-3 py-1.5 text-sm text-accent hover:bg-bg-muted"
              >
                Ver QR
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
