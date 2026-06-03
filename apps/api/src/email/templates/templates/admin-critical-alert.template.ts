import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getAppUrl,
  getCurrentYear,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'Crítica',
};

export function renderAdminCriticalAlert(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const appUrl = getAppUrl();
  const alertTitle = getString(variables, 'alertTitle', 'Alerta operativa');
  const alertMessage = getString(
    variables,
    'alertMessage',
    'Se registró un incidente que requiere revisión.',
  );
  const severityRaw = getString(variables, 'severity', 'high').toLowerCase();
  const severityLabel = SEVERITY_LABELS[severityRaw] ?? escapeHtml(severityRaw);
  const occurredAt = getString(variables, 'occurredAt', new Date().toISOString());
  const context = getString(variables, 'context');
  const adminUrl = getString(variables, 'adminUrl', `${appUrl}/admin`);

  const subject = `[Yo Te Invito] ${alertTitle}`;
  const previewText = `Alerta ${severityLabel}: ${alertTitle}`;

  const contextBlock = context
    ? `<p style="margin:16px 0 0;padding:12px;background:#1f2937;border-radius:8px;font-size:13px;line-height:1.5;color:#e5e7eb;white-space:pre-wrap;">${escapeHtml(context)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Alerta operativa interna de <strong>Yo Te Invito</strong>.</p>
    <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#ffffff;">${escapeHtml(alertTitle)}</p>
    <p style="margin:0 0 12px;">${escapeHtml(alertMessage)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 8px;font-size:14px;color:#e5e7eb;">
      <tr><td style="padding:4px 0;"><strong>Severidad:</strong> ${severityLabel}</td></tr>
      <tr><td style="padding:4px 0;"><strong>Fecha/hora:</strong> ${escapeHtml(occurredAt)}</td></tr>
    </table>
    ${contextBlock}
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">No responder con credenciales, tokens ni secretos del proveedor de email.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    headline: 'Alerta operativa',
    bodyHtml,
    ctaLabel: 'Ver panel admin',
    ctaUrl: adminUrl,
    supportEmail: getString(variables, 'supportEmail', 'soporte@yoteinvito.club'),
    footerNote: `Alerta interna Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    'Alerta operativa — Yo Te Invito',
    '',
    alertTitle,
    '',
    alertMessage,
    '',
    `Severidad: ${severityLabel}`,
    `Fecha/hora: ${occurredAt}`,
    context ? `\nContexto:\n${context}` : '',
    '',
    `Panel admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
