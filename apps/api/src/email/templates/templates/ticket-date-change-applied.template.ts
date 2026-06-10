import type { RenderedEmailTemplate } from '../email-template.types';
import { escapeHtml, getCurrentYear, getDefaultSupportEmail, getString } from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderTicketDateChangeApplied(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const eventTitle = getString(variables, 'eventTitle', 'tu evento');
  const toDate = getString(variables, 'toDate');
  const ticketsUrl = getString(variables, 'ticketsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Tu entrada tiene una nueva fecha';
  const previewText = `Actualizamos la fecha de ${eventTitle}.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">Tu entrada para <strong>${escapeHtml(eventTitle)}</strong> quedó confirmada para el <strong>${escapeHtml(toDate)}</strong>.</p>
    <p style="margin:0 0 12px;">Tu código QR sigue siendo el mismo; en puerta validarán la nueva fecha.</p>
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
    `Nueva fecha para ${eventTitle}: ${toDate}.`,
    '',
    ticketsUrl,
  ].join('\n');

  return { subject, previewText, html, text };
}
