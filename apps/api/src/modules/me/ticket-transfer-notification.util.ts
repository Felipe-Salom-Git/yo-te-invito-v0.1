import type { EmailTemplateId } from '../../email/templates/email-template.types';
import { getAppUrl, getDefaultSupportEmail } from '../../email/templates/email-template.util';

export type TransferEventContext = {
  eventTitle: string;
  eventDate?: string;
  eventTime?: string;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  ticketName?: string;
};

export function formatPersonName(
  firstName?: string | null,
  lastName?: string | null,
  fallback = 'Usuario',
): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || fallback;
}

export function formatEventDateTime(startAt: Date): { eventDate: string; eventTime: string } {
  return {
    eventDate: startAt.toLocaleDateString('es-AR', { dateStyle: 'medium' }),
    eventTime: startAt.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

export function formatExpiresAt(expiresAt: Date): string {
  return expiresAt.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function buildTransferEventContext(event: {
  title: string;
  startAt: Date;
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
}): TransferEventContext {
  const { eventDate, eventTime } = formatEventDateTime(event.startAt);
  return {
    eventTitle: event.title,
    eventDate,
    eventTime,
    venueName: event.venueName?.trim() || undefined,
    venueAddress: event.venueAddress?.trim() || undefined,
    city: event.city?.trim() || undefined,
  };
}

export function buildTicketTransferReceivedVariables(input: {
  recipientName: string;
  senderName: string;
  transferUrl: string;
  expiresAt: Date;
  ticketName?: string;
  event: TransferEventContext;
}): Record<string, unknown> {
  return {
    recipientName: input.recipientName,
    senderName: input.senderName,
    ticketName: input.ticketName ?? 'Entrada',
    transferUrl: input.transferUrl,
    expiresAt: formatExpiresAt(input.expiresAt),
    supportEmail: getDefaultSupportEmail(),
    ...input.event,
  };
}

export function buildTicketTransferSenderVariables(input: {
  senderName: string;
  recipientName: string;
  ticketsUrl: string;
  ticketName?: string;
  event: TransferEventContext;
}): Record<string, unknown> {
  return {
    senderName: input.senderName,
    recipientName: input.recipientName,
    ticketName: input.ticketName ?? 'Entrada',
    ticketsUrl: input.ticketsUrl,
    supportEmail: getDefaultSupportEmail(),
    ...input.event,
  };
}

export function buildTicketTransferCancelledVariables(input: {
  recipientName: string;
  senderName: string;
  ticketsUrl: string;
  ticketName?: string;
  event: TransferEventContext;
}): Record<string, unknown> {
  return {
    recipientName: input.recipientName,
    senderName: input.senderName,
    ticketName: input.ticketName ?? 'Entrada',
    ticketsUrl: input.ticketsUrl,
    supportEmail: getDefaultSupportEmail(),
    ...input.event,
  };
}

export function buildEventReminder24hVariables(input: {
  userName: string;
  ticketUrl: string;
  event: TransferEventContext;
}): Record<string, unknown> {
  return {
    userName: input.userName,
    ticketUrl: input.ticketUrl,
    supportEmail: getDefaultSupportEmail(),
    ...input.event,
  };
}

export function transferTicketsUrl(): string {
  return `${getAppUrl()}/me/tickets`;
}

export function transferOfferUrl(acceptToken: string): string {
  return `${getAppUrl()}/me/ticket-transfer/${acceptToken}`;
}

export const TRANSFER_EMAIL_TEMPLATES = {
  received: 'TICKET_TRANSFER_RECEIVED' as EmailTemplateId,
  accepted: 'TICKET_TRANSFER_ACCEPTED' as EmailTemplateId,
  rejected: 'TICKET_TRANSFER_REJECTED' as EmailTemplateId,
  cancelled: 'TICKET_TRANSFER_CANCELLED' as EmailTemplateId,
} as const;
