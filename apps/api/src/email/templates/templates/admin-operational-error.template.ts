import type { RenderedEmailTemplate } from '../email-template.types';
import { adminEmailFooterYear } from '../admin-operational-email.util';
import {
  escapeHtml,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export function renderAdminOperationalError(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const errorTitle = getString(variables, 'errorTitle', 'Error operativo');
  const errorMessage = getString(variables, 'errorMessage', 'Se registró un incidente operativo.');
  const severityRaw = getString(variables, 'severity', 'high').toLowerCase();
  const severityLabel = SEVERITY_LABELS[severityRaw] ?? escapeHtml(severityRaw);
  const moduleName = getString(variables, 'moduleName');
  const occurredAt = getString(variables, 'occurredAt', new Date().toISOString());
  const context = getString(variables, 'context');
  const adminUrl = getString(variables, 'adminUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `[Yo Te Invito] Error operativo: ${errorTitle}`;
  const previewText = `Severidad ${severityLabel}: ${errorTitle}`;

  const contextBlock = context
    ? `<p style="margin:16px 0 0;padding:12px;background:#1f2937;border-radius:8px;font-size:13px;line-height:1.5;color:#e5e7eb;white-space:pre-wrap;">${escapeHtml(context)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Se registró un error operativo en Yo Te Invito.</p>
    <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#ffffff;">${escapeHtml(errorTitle)}</p>
    <p style="margin:0 0 12px;">${escapeHtml(errorMessage)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;font-size:14px;color:#e5e7eb;">
      <tr><td style="padding:4px 0;"><strong>Severidad:</strong> ${severityLabel}</td></tr>
      ${moduleName ? `<tr><td style="padding:4px 0;"><strong>Módulo:</strong> ${escapeHtml(moduleName)}</td></tr>` : ''}
      <tr><td style="padding:4px 0;"><strong>Fecha/hora:</strong> ${escapeHtml(occurredAt)}</td></tr>
    </table>
    ${contextBlock}
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">No responder con credenciales ni secretos.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    headline: 'Error operativo',
    bodyHtml,
    ctaLabel: 'Ver panel admin',
    ctaUrl: adminUrl,
    supportEmail,
    footerNote: `Alerta interna Yo Te Invito. © ${adminEmailFooterYear()}.`,
  });

  const text = [
    `Error operativo: ${errorTitle}`,
    '',
    errorMessage,
    '',
    `Severidad: ${severityLabel}`,
    moduleName ? `Módulo: ${moduleName}` : '',
    `Fecha/hora: ${occurredAt}`,
    context ? `\nContexto:\n${context}` : '',
    '',
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
