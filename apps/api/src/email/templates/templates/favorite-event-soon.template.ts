import type { RenderedEmailTemplate } from '../email-template.types';
import { optionalEventDetailsHtml } from '../smart-alert-email-layout.util';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderFavoriteEventSoon(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const eventTitle = getString(variables, 'eventTitle', 'un evento de tus favoritos');
  const eventUrl = getString(variables, 'eventUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Pronto comienza ${eventTitle}`;
  const previewText = 'Un evento que guardaste en favoritos está por empezar.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">Te avisamos que <strong>${escapeHtml(eventTitle)}</strong>, que tenés en favoritos, comienza pronto.</p>
    ${optionalEventDetailsHtml(variables)}
    <p style="margin:0;">Revisá la ficha del evento por si hay novedades de horario o ubicación.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver evento',
    ctaUrl: eventUrl,
    supportEmail,
    footerNote: `Aviso de favoritos en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `${eventTitle} (favorito) comienza pronto.`,
    '',
    `Ver evento: ${eventUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
