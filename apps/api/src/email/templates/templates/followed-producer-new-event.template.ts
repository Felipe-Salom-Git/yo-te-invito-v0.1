import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderFollowedProducerNewEvent(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const producerName = getString(variables, 'producerName', 'Una productora');
  const eventTitle = getString(variables, 'eventTitle', 'un evento');
  const eventUrl = getString(variables, 'eventUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `${producerName} publicó algo nuevo`;
  const previewText = `Hay una nueva publicación de ${producerName} que seguís.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(producerName)}</strong>, una productora que seguís, publicó <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p style="margin:0;">Podés ver los detalles y decidir si te interesa.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver evento',
    ctaUrl: eventUrl,
    supportEmail,
    footerNote: `Alerta de seguimiento en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `${producerName} publicó ${eventTitle}.`,
    '',
    `Ver: ${eventUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
