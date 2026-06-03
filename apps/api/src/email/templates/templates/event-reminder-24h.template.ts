import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

function optionalEventDetails(variables: Record<string, unknown>): string {
  const eventDate = getString(variables, 'eventDate');
  const eventTime = getString(variables, 'eventTime');
  const venueName = getString(variables, 'venueName');
  const city = getString(variables, 'city');

  const rows: string[] = [];
  if (eventDate) rows.push(`<li>Fecha: ${escapeHtml(eventDate)}</li>`);
  if (eventTime) rows.push(`<li>Hora: ${escapeHtml(eventTime)}</li>`);
  if (venueName) rows.push(`<li>Lugar: ${escapeHtml(venueName)}</li>`);
  if (city) rows.push(`<li>Ciudad: ${escapeHtml(city)}</li>`);

  if (rows.length === 0) return '';
  return `<p style="margin:16px 0 8px;font-weight:bold;">Detalles del evento</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">${rows.join('')}</ul>`;
}

export function renderEventReminder24h(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const eventTitle = getString(variables, 'eventTitle', 'tu evento');
  const ticketUrl = getString(variables, 'ticketUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Mañana es ${eventTitle}`;
  const previewText =
    'Tené tu ticket listo y revisá los datos del evento antes de asistir.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">Te recordamos que <strong>${escapeHtml(eventTitle)}</strong> es mañana.</p>
    <p style="margin:0 0 12px;">Prepará tu ticket con QR y revisá los datos del evento antes de salir.</p>
    ${optionalEventDetails(variables)}
    <p style="margin:0;">Te recomendamos llegar con anticipación y tener tu QR disponible desde el celular.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver mi ticket',
    ctaUrl: ticketUrl,
    supportEmail,
    footerNote: `Recordatorio porque tenés un ticket en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `Mañana es ${eventTitle}.`,
    '',
    `Ver mi ticket: ${ticketUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
