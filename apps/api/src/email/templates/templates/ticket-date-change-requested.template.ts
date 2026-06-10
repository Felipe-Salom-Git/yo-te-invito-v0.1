import type { RenderedEmailTemplate } from '../email-template.types';
import { escapeHtml, getCurrentYear, getDefaultSupportEmail, getString } from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderTicketDateChangeRequested(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const eventTitle = getString(variables, 'eventTitle', 'tu evento');
  const fromDate = getString(variables, 'fromDate');
  const toDate = getString(variables, 'toDate');
  const ticketsUrl = getString(variables, 'ticketsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Solicitud de cambio de fecha recibida';
  const previewText = `Registramos tu pedido para ${eventTitle}.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">Recibimos tu solicitud para cambiar la fecha de tu entrada a <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p style="margin:0 0 12px;">Fecha actual: <strong>${escapeHtml(fromDate)}</strong><br/>Nueva fecha solicitada: <strong>${escapeHtml(toDate)}</strong></p>
    <p style="margin:0 0 12px;">Te avisaremos cuando la productora revise o confirme el cambio.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver mi entrada',
    ctaUrl: ticketsUrl,
    supportEmail,
    footerNote: `Yo Te Invito · © ${getCurrentYear()}`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `Solicitud de cambio de fecha para ${eventTitle}.`,
    `De ${fromDate} a ${toDate}.`,
    '',
    `Ver entrada: ${ticketsUrl}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
