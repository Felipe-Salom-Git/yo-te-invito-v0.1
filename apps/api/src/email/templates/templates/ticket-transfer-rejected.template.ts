import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderTicketTransferRejected(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const senderName = getString(variables, 'senderName', 'ahí');
  const recipientName = getString(variables, 'recipientName', 'El receptor');
  const eventTitle = getString(variables, 'eventTitle', 'tu evento');
  const ticketName = getString(variables, 'ticketName', 'Entrada');
  const ticketsUrl = getString(variables, 'ticketsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `${recipientName} rechazó la transferencia de ticket`;
  const previewText = `La transferencia para ${eventTitle} no fue aceptada.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(senderName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(recipientName)}</strong> rechazó la transferencia del ticket (<strong>${escapeHtml(ticketName)}</strong>) para <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p style="margin:0 0 12px;">El ticket vuelve a quedar bajo tu cuenta, sujeto al estado actual del evento y del ticket.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver mis tickets',
    ctaUrl: ticketsUrl,
    supportEmail,
    footerNote: `Rechazo de transferencia en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${senderName},`,
    '',
    `${recipientName} rechazó la transferencia para ${eventTitle}.`,
    '',
    `Ver mis tickets: ${ticketsUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
