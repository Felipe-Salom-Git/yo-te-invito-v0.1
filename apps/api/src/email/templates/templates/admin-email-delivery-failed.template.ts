import type { RenderedEmailTemplate } from '../email-template.types';
import { adminEmailFooterYear } from '../admin-operational-email.util';
import {
  escapeHtml,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAdminEmailDeliveryFailed(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const templateId = getString(variables, 'templateId', 'desconocido');
  const recipient = getString(variables, 'recipient', '—');
  const provider = getString(variables, 'provider', '—');
  const errorCode = getString(variables, 'errorCode', 'SEND_FAILED');
  const errorMessage = getString(variables, 'errorMessage');
  const occurredAt = getString(variables, 'occurredAt', new Date().toISOString());
  const context = getString(variables, 'context');
  const adminUrl = getString(variables, 'adminUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Fallo de entrega de email — ${templateId}`;
  const previewText = 'Un email transaccional u operativo no pudo enviarse.';

  const contextBlock = context
    ? `<p style="margin:16px 0 0;padding:12px;background:#1f2937;border-radius:8px;font-size:13px;line-height:1.5;color:#e5e7eb;white-space:pre-wrap;">${escapeHtml(context)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Se detectó un fallo al enviar un email desde Yo Te Invito.</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li>Template: ${escapeHtml(templateId)}</li>
      <li>Destinatario: ${escapeHtml(recipient)}</li>
      <li>Proveedor: ${escapeHtml(provider)}</li>
      <li>Código: ${escapeHtml(errorCode)}</li>
      <li>Fecha/hora: ${escapeHtml(occurredAt)}</li>
    </ul>
    ${errorMessage ? `<p style="margin:0 0 12px;">${escapeHtml(errorMessage)}</p>` : ''}
    ${contextBlock}
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Revisar logs y configuración SMTP/Resend. No reenviar credenciales por email.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    headline: 'Fallo de email',
    bodyHtml,
    ctaLabel: 'Revisar operación',
    ctaUrl: adminUrl,
    supportEmail,
    footerNote: `Alerta interna Yo Te Invito. © ${adminEmailFooterYear()}.`,
  });

  const text = [
    `Fallo de email: ${templateId}`,
    '',
    `Destinatario: ${recipient}`,
    `Proveedor: ${provider}`,
    `Código: ${errorCode}`,
    `Fecha: ${occurredAt}`,
    errorMessage ? `Mensaje: ${errorMessage}` : '',
    context ? `Contexto:\n${context}` : '',
    '',
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
