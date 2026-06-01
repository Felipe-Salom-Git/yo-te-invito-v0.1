import type { RenderedEmailTemplate } from '../email-template.types';
import { adminEmailFooterYear } from '../admin-operational-email.util';
import {
  escapeHtml,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAdminScannerCriticalError(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const scannerLocation = getString(variables, 'scannerLocation', 'Scanner');
  const eventTitle = getString(variables, 'eventTitle');
  const errorMessage = getString(variables, 'errorMessage', 'Error crítico del sistema de scanner.');
  const occurredAt = getString(variables, 'occurredAt', new Date().toISOString());
  const context = getString(variables, 'context');
  const adminUrl = getString(variables, 'adminUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Alerta crítica de scanner — ${scannerLocation}`;
  const previewText = 'Se detectó un error crítico del sistema de scanner (no un rechazo de ticket normal).';

  const contextBlock = context
    ? `<p style="margin:16px 0 0;padding:12px;background:#1f2937;border-radius:8px;font-size:13px;line-height:1.5;color:#e5e7eb;white-space:pre-wrap;">${escapeHtml(context)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Alerta crítica vinculada al scanner de Yo Te Invito.</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li>Ubicación/dispositivo: ${escapeHtml(scannerLocation)}</li>
      ${eventTitle ? `<li>Evento: ${escapeHtml(eventTitle)}</li>` : ''}
      <li>Fecha/hora: ${escapeHtml(occurredAt)}</li>
    </ul>
    <p style="margin:0 0 12px;">${escapeHtml(errorMessage)}</p>
    ${contextBlock}
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">No compartir datos sensibles del ticket por canales no autorizados.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    headline: 'Scanner — error crítico',
    bodyHtml,
    ctaLabel: 'Ver auditoría',
    ctaUrl: adminUrl,
    supportEmail,
    footerNote: `Alerta interna Yo Te Invito. © ${adminEmailFooterYear()}.`,
  });

  const text = [
    `Alerta scanner: ${scannerLocation}`,
    eventTitle ? `Evento: ${eventTitle}` : '',
    '',
    errorMessage,
    occurredAt ? `Fecha: ${occurredAt}` : '',
    context ? `Contexto:\n${context}` : '',
    '',
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
