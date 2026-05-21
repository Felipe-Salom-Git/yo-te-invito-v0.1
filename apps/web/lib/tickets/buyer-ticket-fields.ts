import type { MeTicketDetail, TicketTemplateDynamicFieldKey } from '@yo-te-invito/shared';

export type BuyerTicketFieldContext = {
  ticket: MeTicketDetail;
};

function formatEventDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function shortTicketCode(ticketId: string): string {
  const tail = ticketId.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase();
  return tail || ticketId.slice(0, 8).toUpperCase();
}

/** Resolves dynamic layer keys for buyer ticket render (real data, not studio mocks). */
export function resolveBuyerDynamicField(
  key: TicketTemplateDynamicFieldKey,
  ctx: BuyerTicketFieldContext,
): string {
  const { ticket } = ctx;
  const ev = ticket.event;

  switch (key) {
    case 'eventName':
      return ev.title;
    case 'eventDate':
      return formatEventDate(ev.startAt);
    case 'venueName':
      return ev.venueName ?? '';
    case 'city':
      return ev.city ?? '';
    case 'holderName':
      return ticket.holderName ?? '';
    case 'orderCode':
      return ticket.orderId ? shortTicketCode(ticket.orderId) : '—';
    case 'ticketTypeName':
      return ticket.ticketType?.name ?? '';
    case 'batchName':
      return ticket.batchName ?? '';
    case 'ticketId':
      return shortTicketCode(ticket.ticketId);
    case 'disclaimer':
      return 'Presentá este QR en el ingreso. No válido si está alterado.';
    default:
      return '';
  }
}
