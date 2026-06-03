import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderReviewModerationRestored(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const recipientName = getString(variables, 'recipientName', 'ahí');
  const entityTitle = getString(variables, 'entityTitle', 'la entidad');
  const reviewsUrl = getString(variables, 'reviewsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Una reseña fue restaurada';
  const previewText = `La reseña vinculada a ${entityTitle} volvió a estar disponible.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 12px;">Te informamos que una reseña vinculada a <strong>${escapeHtml(entityTitle)}</strong> fue <strong>restaurada</strong>.</p>
    <p style="margin:0;">La reseña vuelve a mostrarse públicamente según su estado actual en la plataforma.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver reseña',
    ctaUrl: reviewsUrl,
    supportEmail,
    footerNote: `Moderación en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${recipientName},`,
    '',
    `Tu reseña en ${entityTitle} fue restaurada.`,
    '',
    `Ver reseña: ${reviewsUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
