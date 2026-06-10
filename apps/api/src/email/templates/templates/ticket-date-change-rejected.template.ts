import type { RenderedEmailTemplate } from '../email-template.types';
import { escapeHtml, getCurrentYear, getDefaultSupportEmail, getString } from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderTicketDateChangeRejected(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const eventTitle = getString(variables, 'eventTitle', 'tu evento');
  const rejectReason = getString(variables, 'rejectReason', 'Sin motivo indicado');
  const ticketsUrl = getString(variables, 'ticketsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Cambio de fecha no aprobado';
  const previewText = `No pudimos cambiar la fecha de tu entrada a ${eventTitle}.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">La productora no aprobó el cambio de fecha para <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p style="margin:0 0 12px;">Motivo: ${escapeHtml(rejectReason)}</p>
    <p style="margin:0 0 12px;">Tu entrada mantiene la fecha original.</p>
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
    `Cambio rechazado para ${eventTitle}.`,
    `Motivo: ${rejectReason}`,
    '',
    ticketsUrl,
  ].join('\n');

  return { subject, previewText, html, text };
}
