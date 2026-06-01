import type { RenderedEmailTemplate } from '../email-template.types';
import { optionalEventDetailsHtml } from '../smart-alert-email-layout.util';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderExpectedEventSoon(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const eventTitle = getString(variables, 'eventTitle', 'tu evento esperado');
  const eventUrl = getString(variables, 'eventUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Tu evento esperado comienza pronto: ${eventTitle}`;
  const previewText = 'Revisá si ya hay entradas o novedades antes de la fecha.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">Marcaste <strong>${escapeHtml(eventTitle)}</strong> como evento esperado y su fecha está cerca.</p>
    ${optionalEventDetailsHtml(variables)}
    <p style="margin:0;">Entrá a la ficha para ver disponibilidad de entradas y detalles actualizados.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver evento',
    ctaUrl: eventUrl,
    supportEmail,
    footerNote: `Aviso de eventos esperados en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `Tu evento esperado ${eventTitle} comienza pronto.`,
    '',
    `Ver evento: ${eventUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
