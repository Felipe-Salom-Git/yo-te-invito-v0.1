import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderTicketTransferCancelled(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const recipientName = getString(variables, 'recipientName', 'ahí');
  const senderName = getString(variables, 'senderName', 'El emisor');
  const eventTitle = getString(variables, 'eventTitle', 'un evento');
  const ticketName = getString(variables, 'ticketName', 'Entrada');
  const ticketsUrl = getString(variables, 'ticketsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'La transferencia de ticket fue cancelada';
  const previewText = `La transferencia para ${eventTitle} ya no está disponible.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 12px;">La transferencia del ticket (<strong>${escapeHtml(ticketName)}</strong>) para <strong>${escapeHtml(eventTitle)}</strong> fue cancelada por <strong>${escapeHtml(senderName)}</strong>.</p>
    <p style="margin:0 0 12px;">Ya no podés aceptar esa transferencia desde el enlace anterior.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ir a mis tickets',
    ctaUrl: ticketsUrl,
    supportEmail,
    footerNote: `Cancelación de transferencia en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${recipientName},`,
    '',
    `${senderName} canceló la transferencia para ${eventTitle}.`,
    '',
    `Ir a mis tickets: ${ticketsUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
