import type { RenderedEmailTemplate } from '../email-template.types';
import { escapeHtml, getCurrentYear, getDefaultSupportEmail, getString } from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderTicketDateChangePendingProducer(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const producerName = getString(variables, 'producerName', 'ahí');
  const eventTitle = getString(variables, 'eventTitle', 'tu evento');
  const buyerName = getString(variables, 'buyerName', 'Un comprador');
  const fromDate = getString(variables, 'fromDate');
  const toDate = getString(variables, 'toDate');
  const eventUrl = getString(variables, 'eventUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Cambio de fecha pendiente — ${eventTitle}`;
  const previewText = `${buyerName} solicitó cambiar la fecha de una entrada.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(producerName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(buyerName)}</strong> pidió cambiar una entrada de <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p style="margin:0 0 12px;">De <strong>${escapeHtml(fromDate)}</strong> a <strong>${escapeHtml(toDate)}</strong>.</p>
    <p style="margin:0 0 12px;">Revisá la solicitud en tu portal de productora.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver evento',
    ctaUrl: eventUrl,
    supportEmail,
    footerNote: `Yo Te Invito · © ${getCurrentYear()}`,
  });

  const text = [
    `Hola ${producerName},`,
    '',
    `${buyerName} solicitó cambio de fecha para ${eventTitle}.`,
    `De ${fromDate} a ${toDate}.`,
    '',
    eventUrl,
  ].join('\n');

  return { subject, previewText, html, text };
}
