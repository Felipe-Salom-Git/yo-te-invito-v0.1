import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderReviewDisputeCreated(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const recipientName = getString(variables, 'recipientName', 'ahí');
  const entityTitle = getString(variables, 'entityTitle', 'tu entidad');
  const reason = getString(variables, 'reason');
  const disputeUrl = getString(variables, 'disputeUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Se creó una disputa de reseña';
  const previewText = 'La solicitud fue registrada y quedará disponible para revisión.';

  const reasonBlock = reason
    ? `<p style="margin:16px 0 8px;font-weight:bold;">Motivo indicado</p>
       <p style="margin:0 0 16px;padding:12px;background:#1f2937;border-radius:8px;color:#e5e7eb;">${escapeHtml(reason)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(recipientName)},</p>
    <p style="margin:0 0 12px;">Registramos una disputa sobre una reseña vinculada a <strong>${escapeHtml(entityTitle)}</strong>.</p>
    <p style="margin:0 0 12px;">Nuestro equipo revisará el caso según los criterios de moderación de la plataforma.</p>
    ${reasonBlock}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver disputa',
    ctaUrl: disputeUrl,
    supportEmail,
    footerNote: `Disputa de reseña en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${recipientName},`,
    '',
    `Disputa registrada para ${entityTitle}.`,
    reason ? `\nMotivo: ${reason}` : '',
    '',
    `Ver disputa: ${disputeUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
