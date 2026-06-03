import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderReviewDisputeRejected(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const recipientName = getString(variables, 'recipientName', 'ahí');
  const entityTitle = getString(variables, 'entityTitle', 'tu entidad');
  const resolutionNote = getString(variables, 'resolutionNote');
  const reviewsUrl = getString(variables, 'reviewsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'La disputa de reseña fue rechazada';
  const previewText =
    'Administración revisó el caso y la reseña se mantiene según el estado indicado.';

  const noteBlock = resolutionNote
    ? `<p style="margin:16px 0 8px;font-weight:bold;">Motivo de la decisión</p>
       <p style="margin:0 0 16px;padding:12px;background:#1f2937;border-radius:8px;color:#e5e7eb;">${escapeHtml(resolutionNote)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 12px;">Administración revisó la disputa vinculada a <strong>${escapeHtml(entityTitle)}</strong> y decidió <strong>rechazarla</strong>.</p>
    <p style="margin:0 0 12px;">La valoración sigue visible públicamente según su estado actual.</p>
    ${noteBlock}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver resolución',
    ctaUrl: reviewsUrl,
    supportEmail,
    footerNote: `Decisión administrativa en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${recipientName},`,
    '',
    `Disputa rechazada para ${entityTitle}.`,
    resolutionNote ? `\n${resolutionNote}` : '',
    '',
    `Ver resolución: ${reviewsUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
