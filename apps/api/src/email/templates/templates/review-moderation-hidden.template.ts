import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderReviewModerationHidden(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const recipientName = getString(variables, 'recipientName', 'ahí');
  const entityTitle = getString(variables, 'entityTitle', 'la entidad');
  const moderationReason = getString(variables, 'moderationReason');
  const reviewsUrl = getString(variables, 'reviewsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Una reseña fue ocultada por moderación';
  const previewText = `La reseña vinculada a ${entityTitle} ya no está visible públicamente.`;

  const reasonBlock = moderationReason
    ? `<p style="margin:16px 0 8px;font-weight:bold;">Motivo informado</p>
       <p style="margin:0 0 16px;padding:12px;background:#1f2937;border-radius:8px;color:#e5e7eb;">${escapeHtml(moderationReason)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 12px;">Te informamos que una reseña vinculada a <strong>${escapeHtml(entityTitle)}</strong> fue ocultada por moderación.</p>
    <p style="margin:0 0 12px;">Esta acción puede deberse a una revisión administrativa, una disputa aceptada o criterios internos de la plataforma.</p>
    ${reasonBlock}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver detalles',
    ctaUrl: reviewsUrl,
    supportEmail,
    footerNote: `Moderación en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${recipientName},`,
    '',
    `Tu reseña en ${entityTitle} fue ocultada.`,
    moderationReason ? `\nMotivo: ${moderationReason}` : '',
    '',
    `Ver detalles: ${reviewsUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
