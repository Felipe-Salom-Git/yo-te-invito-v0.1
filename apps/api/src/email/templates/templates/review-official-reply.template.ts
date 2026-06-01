import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderReviewOfficialReply(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const entityTitle = getString(variables, 'entityTitle', 'la entidad');
  const officialReply = getString(variables, 'officialReply');
  const reviewUrl = getString(variables, 'reviewUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Respondieron tu reseña sobre ${entityTitle}`;
  const previewText = 'Hay una respuesta oficial disponible para la reseña que dejaste.';

  const replyBlock = officialReply
    ? `<p style="margin:16px 0 8px;font-weight:bold;">Respuesta</p>
       <p style="margin:0 0 16px;padding:12px;background:#1f2937;border-radius:8px;color:#e5e7eb;">${escapeHtml(officialReply)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(entityTitle)}</strong> respondió oficialmente la reseña que dejaste en Yo Te Invito.</p>
    ${replyBlock}
    <p style="margin:0;">Podés ver la conversación completa desde la plataforma.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver respuesta',
    ctaUrl: reviewUrl,
    supportEmail,
    footerNote: `Interacción con tu reseña en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `${entityTitle} respondió tu reseña.`,
    officialReply ? `\n${officialReply}` : '',
    '',
    `Ver respuesta: ${reviewUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
