'use client';

import type { MeTicketDetail } from '@yo-te-invito/shared';
import { Logo } from '@/components/brand/Logo';
import { StatusBadge } from '@/components/domain/StatusBadge';
import {
  resolveBuyerDynamicField,
  shortTicketCode,
  type BuyerTicketFieldContext,
} from '@/lib/tickets/buyer-ticket-fields';
import { TicketEntryStatusBanner } from './TicketEntryStatusBanner';
import { TicketQrImage } from './TicketQrImage';
import {
  isTicketEntryBlocked,
} from '@/lib/tickets/ticket-status-ui';

type Props = {
  ticket: MeTicketDetail;
  className?: string;
};

/** Premium fallback when no producer template or template is unusable. */
export function DefaultBuyerTicket({ ticket, className = '' }: Props) {
  const ctx: BuyerTicketFieldContext = { ticket };
  const ev = ticket.event;
  const blocked = isTicketEntryBlocked(ticket.status);
  const when = resolveBuyerDynamicField('eventDate', ctx);
  const venue = [ev.venueName, ev.city].filter(Boolean).join(' · ');

  return (
    <article
      className={`mx-auto w-full max-w-sm overflow-hidden rounded-xl border-2 border-accent/30 bg-gradient-to-b from-bg-muted to-bg shadow-lg ${className}`}
    >
      <div className="border-b border-border bg-bg-muted/80 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <Logo variant="auth" showText className="shrink-0" />
          <StatusBadge status={ticket.status} kind="ticket" />
        </div>
      </div>

      <div className="relative px-5 py-5">
        <h2 className="text-xl font-semibold leading-tight text-text">{ev.title}</h2>
        {when ? (
          <p className="mt-2 text-sm text-text-muted">
            {ticket.event.occurrenceStartAt ? 'Fecha de tu entrada: ' : ''}
            {when}
          </p>
        ) : null}
        {venue && <p className="mt-1 text-sm text-text-muted">{venue}</p>}

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted">
          <span className="rounded border border-border px-2 py-1">
            {ticket.ticketType?.name ?? 'Entrada'}
          </span>
          <span className="rounded border border-border px-2 py-1 font-mono">
            {shortTicketCode(ticket.ticketId)}
          </span>
        </div>

        {ticket.holderName && (
          <p className="mt-3 text-sm text-text">
            Titular: <span className="font-medium">{ticket.holderName}</span>
          </p>
        )}

        <div className="relative mt-6 flex justify-center">
          <TicketQrImage qrPayload={ticket.qrPayload} sizePx={280} />
          {blocked && (
            <div
              className="ticket-status-overlay absolute inset-0 flex items-center justify-center rounded-lg bg-black/45 print:hidden"
              role="presentation"
            />
          )}
        </div>

        <TicketEntryStatusBanner status={ticket.status} className="mt-4" />

        <p className="mt-4 text-center text-xs text-text-muted">
          {blocked
            ? 'Este código no habilita el ingreso en su estado actual.'
            : 'Presentá este QR en el acceso al evento.'}
        </p>
      </div>
    </article>
  );
}
