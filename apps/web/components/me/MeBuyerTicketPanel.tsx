'use client';

import { useRef } from 'react';
import Link from 'next/link';
import type { MeTicketDetail } from '@yo-te-invito/shared';
import { Button } from '@/components';
import { BuyerTicketVisual } from '@/components/tickets/BuyerTicketVisual';
import { shortTicketCode } from '@/lib/tickets/buyer-ticket-fields';
import { isValidTicketQrPayload } from '@/lib/tickets/qr-display';
import { isTicketEntryBlocked } from '@/lib/tickets/ticket-status-ui';

const TENANT_ID = 'tenant-demo';

type Props = {
  ticket: MeTicketDetail;
};

export function MeBuyerTicketPanel({ ticket }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const event = ticket.event;
  const blocked = isTicketEntryBlocked(ticket.status);
  const qrOk = isValidTicketQrPayload(ticket.qrPayload);

  return (
    <div className="w-full">
      <div
        id="ticket-print-area"
        ref={printRef}
        className="ticket-print-area mx-auto w-full max-w-md"
        data-ticket-status={ticket.status}
      >
        <BuyerTicketVisual ticket={ticket} />
        <dl className="ticket-print-meta mt-4 hidden gap-1 text-sm text-neutral-800 print:grid">
          <div>
            <dt className="inline font-semibold">Evento: </dt>
            <dd className="inline">{event.title}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Fecha: </dt>
            <dd className="inline">
              {new Date(event.startAt).toLocaleString('es-AR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </dd>
          </div>
          {event.venueName && (
            <div>
              <dt className="inline font-semibold">Lugar: </dt>
              <dd className="inline">{event.venueName}</dd>
            </div>
          )}
          <div>
            <dt className="inline font-semibold">Tipo: </dt>
            <dd className="inline">{ticket.ticketType?.name ?? 'Entrada'}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Estado: </dt>
            <dd className="inline">{ticket.status}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Código: </dt>
            <dd className="inline font-mono">{shortTicketCode(ticket.ticketId)}</dd>
          </div>
        </dl>
        <p className="ticket-print-footer mt-3 hidden text-center text-xs text-neutral-600 print:block">
          {event.title} · {shortTicketCode(ticket.ticketId)} · Yo Te Invito
          {blocked ? ' · No válido para ingreso' : ''}
        </p>
      </div>

      {!qrOk && (
        <p className="portal-chrome mt-3 text-sm text-amber-400" role="alert">
          El código QR de este ticket no tiene el formato esperado. Contactá soporte si no podés
          ingresar.
        </p>
      )}

      <div className="portal-chrome mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button type="button" className="w-full sm:w-auto" onClick={handlePrint}>
          Imprimir ticket
        </Button>
        <Link
          href="/me/tickets"
          className="inline-flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-text hover:border-accent/50 sm:w-auto"
        >
          Mis tickets
        </Link>
      </div>

      <dl className="portal-chrome mt-6 grid gap-3 rounded-lg border border-border bg-bg-muted/40 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-text-muted">Estado</dt>
          <dd className="mt-0.5 text-text">{ticket.status}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">Tipo</dt>
          <dd className="mt-0.5 text-text">{ticket.ticketType?.name ?? '—'}</dd>
        </div>
        {ticket.orderId && (
          <div>
            <dt className="text-xs text-text-muted">Pedido</dt>
            <dd className="mt-0.5 break-all font-mono text-xs text-text">{ticket.orderId}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-text-muted">Código ticket</dt>
          <dd className="mt-0.5 font-mono text-xs text-text">{shortTicketCode(ticket.ticketId)}</dd>
        </div>
        {ticket.holderName && (
          <div className="sm:col-span-2">
            <dt className="text-xs text-text-muted">Titular</dt>
            <dd className="mt-0.5 text-text">{ticket.holderName}</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-xs text-text-muted">Evento</dt>
          <dd className="mt-0.5">
            <Link
              href={`/events/${event.id}?tenantId=${TENANT_ID}`}
              className="text-accent hover:underline"
            >
              {event.title}
            </Link>
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-text-muted">Fecha</dt>
          <dd className="mt-0.5 text-text-muted">
            {new Date(event.startAt).toLocaleString('es-AR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
            {event.venueName ? ` · ${event.venueName}` : ''}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-text-muted">ID técnico</dt>
          <dd className="mt-0.5 break-all font-mono text-xs text-text-muted">{ticket.ticketId}</dd>
        </div>
      </dl>
    </div>
  );
}
