import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

function optionalEventDetails(variables: Record<string, unknown>): string {
  const eventTitle = getString(variables, 'eventTitle');
  const eventDate = getString(variables, 'eventDate');
  const eventTime = getString(variables, 'eventTime');
  const venueName = getString(variables, 'venueName');
  const venueAddress = getString(variables, 'venueAddress');
  const ticketName = getString(variables, 'ticketName');
  const expiresAt = getString(variables, 'expiresAt');

  const rows: string[] = [];
  if (eventTitle) rows.push(`<li>Evento: ${escapeHtml(eventTitle)}</li>`);
  if (ticketName) rows.push(`<li>Entrada: ${escapeHtml(ticketName)}</li>`);
  if (eventDate) rows.push(`<li>Fecha: ${escapeHtml(eventDate)}</li>`);
  if (eventTime) rows.push(`<li>Hora: ${escapeHtml(eventTime)}</li>`);
  if (venueName) rows.push(`<li>Lugar: ${escapeHtml(venueName)}</li>`);
  if (venueAddress) rows.push(`<li>Dirección: ${escapeHtml(venueAddress)}</li>`);
  if (expiresAt) rows.push(`<li>Vence: ${escapeHtml(expiresAt)}</li>`);

  if (rows.length === 0) return '';
  return `<p style="margin:16px 0 8px;font-weight:bold;">Detalles</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">${rows.join('')}</ul>`;
}

export function renderTicketTransferReceived(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const recipientName = getString(variables, 'recipientName', 'ahí');
  const senderName = getString(variables, 'senderName', 'Un usuario');
  const eventTitle = getString(variables, 'eventTitle', 'un evento');
  const transferUrl = getString(variables, 'transferUrl');
  const expiresAt = getString(variables, 'expiresAt');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `${senderName} te transfirió un ticket para ${eventTitle}`;
  const previewText =
    'Tenés una transferencia pendiente. Revisala y aceptala antes de que venza.';

  const expiryNote = expiresAt
    ? `<p style="margin:0 0 12px;">La transferencia estará disponible hasta <strong>${escapeHtml(expiresAt)}</strong>. Si no la aceptás antes, puede vencer automáticamente.</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(senderName)}</strong> te transfirió un ticket para <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p style="margin:0 0 12px;">Para que el ticket quede asociado a tu cuenta, revisá la transferencia y aceptala desde Yo Te Invito.</p>
    ${optionalEventDetails(variables)}
    ${expiryNote}
    <p style="margin:0;font-size:13px;color:#9ca3af;">Si no esperabas esta transferencia, podés ignorar este mensaje.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Revisar transferencia',
    ctaUrl: transferUrl,
    supportEmail,
    footerNote: `Transferencia de ticket en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${recipientName},`,
    '',
    `${senderName} te transfirió un ticket para ${eventTitle}.`,
    '',
    `Revisar transferencia: ${transferUrl}`,
    expiresAt ? `Vence: ${expiresAt}` : '',
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
