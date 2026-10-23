import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export type GastroLifecycleDetail = { label: string; value: string };

/** Optional `details` variable: [{ label, value }] rendered as a summary table (G8.8). */
export function readLifecycleDetails(variables: Record<string, unknown>): GastroLifecycleDetail[] {
  const raw = variables.details;
  if (!Array.isArray(raw)) return [];
  const out: GastroLifecycleDetail[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { label, value } = item as Record<string, unknown>;
    if (typeof label === 'string' && typeof value === 'string' && label && value) {
      out.push({ label, value });
    }
  }
  return out;
}

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

  const details = readLifecycleDetails(variables);
  const detailsHtml = details.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 12px;border-collapse:collapse;">${details
        .map(
          (d) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#64748b;font-size:13px;vertical-align:top;">${escapeHtml(d.label)}</td><td style="padding:4px 0;font-size:14px;font-weight:600;">${escapeHtml(d.value)}</td></tr>`,
        )
        .join('')}</table>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 12px;">${escapeHtml(body)}</p>
    ${detailsHtml}
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
    ...(details.length ? [...details.map((d) => `${d.label}: ${d.value}`), ''] : []),
    ctaUrl ? `${ctaLabel}: ${ctaUrl}` : '',
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
