import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderTicketTransferExpired(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const eventTitle = getString(variables, 'eventTitle', 'un evento');
  const ticketName = getString(variables, 'ticketName', 'Entrada');
  const transferExpiresAt = getString(variables, 'transferExpiresAt');
  const ticketsUrl = getString(variables, 'ticketsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'La transferencia de ticket venció';
  const previewText = `La transferencia para ${eventTitle} ya no está disponible.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">La transferencia del ticket (<strong>${escapeHtml(ticketName)}</strong>) para <strong>${escapeHtml(eventTitle)}</strong> venció porque no fue aceptada dentro del plazo.</p>
    <p style="margin:0 0 12px;">Si todavía necesitás realizar esta operación, el titular puede generar una nueva transferencia desde su cuenta, siempre que el ticket y el evento lo permitan.</p>
    ${transferExpiresAt ? `<p style="margin:0 0 12px;">Vencimiento: ${escapeHtml(transferExpiresAt)}</p>` : ''}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver mis tickets',
    ctaUrl: ticketsUrl,
    supportEmail,
    footerNote: `Aviso de vencimiento de transferencia en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `La transferencia para ${eventTitle} venció.`,
    '',
    `Ver mis tickets: ${ticketsUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
