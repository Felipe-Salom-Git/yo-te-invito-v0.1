import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderReviewReceived(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const recipientName = getString(variables, 'recipientName', 'ahí');
  const reviewAuthorName = getString(variables, 'reviewAuthorName', 'Un usuario');
  const entityTitle = getString(variables, 'entityTitle', 'tu entidad');
  const rating = getString(variables, 'rating');
  const reviewText = getString(variables, 'reviewText');
  const reviewsUrl = getString(variables, 'reviewsUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Recibiste una nueva reseña en ${entityTitle}`;
  const previewText =
    'Una persona dejó una valoración. Podés revisarla y responder desde tu portal.';

  const ratingLine = rating ? `<li>Valoración: ${escapeHtml(rating)}/10</li>` : '';
  const commentBlock = reviewText
    ? `<p style="margin:16px 0 8px;font-weight:bold;">Comentario</p>
       <p style="margin:0 0 16px;padding:12px;background:#1f2937;border-radius:8px;color:#e5e7eb;">${escapeHtml(reviewText)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 12px;">Recibiste una nueva reseña en <strong>${escapeHtml(entityTitle)}</strong>.</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li>Autor: ${escapeHtml(reviewAuthorName)}</li>
      ${ratingLine}
    </ul>
    ${commentBlock}
    <p style="margin:0;">Podés revisar la reseña completa y responder de forma oficial desde tu portal.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver reseña',
    ctaUrl: reviewsUrl,
    supportEmail,
    footerNote: `Nueva reseña en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${recipientName},`,
    '',
    `Nueva reseña en ${entityTitle} de ${reviewAuthorName}.`,
    rating ? `Valoración: ${rating}/10` : '',
    reviewText ? `\n${reviewText}` : '',
    '',
    `Ver reseña: ${reviewsUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
