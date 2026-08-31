import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderGastroLifecycle(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const recipientName = getString(variables, 'recipientName', 'Hola');
  const subject = getString(variables, 'subject', 'Novedad en Yo Te Invito');
  const previewText = getString(variables, 'previewText', subject);
  const body = getString(variables, 'body', '');
  const ctaLabel = getString(variables, 'ctaLabel', 'Ver en el portal');
  const ctaUrl = getString(variables, 'ctaUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 12px;">${escapeHtml(body)}</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    supportEmail,
    footerNote: `Notificación operativa de Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${recipientName},`,
    '',
    body,
    '',
    ctaUrl ? `${ctaLabel}: ${ctaUrl}` : '',
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
