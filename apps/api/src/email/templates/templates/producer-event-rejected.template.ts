import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderProducerEventRejected(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const producerName = getString(variables, 'producerName', 'Productor/a');
  const eventTitle = getString(variables, 'eventTitle', 'Tu evento');
  const rejectionReason = getString(variables, 'rejectionReason');
  const eventEditUrl = getString(variables, 'eventEditUrl');
  const dashboardUrl = getString(variables, 'dashboardUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `No pudimos aprobar tu evento: ${eventTitle}`;
  const previewText =
    'Revisá el motivo indicado por administración y corregí la información desde tu portal.';

  const reasonBlock = rejectionReason
    ? `<p style="margin:16px 0 8px;font-weight:bold;">Motivo informado por administración</p>
       <p style="margin:0 0 16px;padding:12px;background:#1f2937;border-radius:8px;color:#e5e7eb;">${escapeHtml(rejectionReason)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(producerName)},</p>
    <p style="margin:0 0 12px;">Revisamos tu evento <strong>${escapeHtml(eventTitle)}</strong>, pero por el momento no pudo ser aprobado.</p>
    <p style="margin:0 0 12px;">Esto no significa que no pueda publicarse más adelante. Te recomendamos revisar el motivo y realizar los ajustes necesarios.</p>
    ${reasonBlock}
    <p style="margin:0;">Una vez corregida la información, podés volver a enviar el evento a revisión si el flujo lo permite.</p>
    <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">Portal: <a href="${escapeHtml(dashboardUrl)}" style="color:#22c55e;">${escapeHtml(dashboardUrl)}</a></p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Editar evento',
    ctaUrl: eventEditUrl,
    supportEmail,
    footerNote: `Decisión administrativa sobre un evento en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${producerName},`,
    '',
    `El evento "${eventTitle}" no pudo ser aprobado.`,
    rejectionReason ? `\nMotivo: ${rejectionReason}` : '',
    '',
    `Editar evento: ${eventEditUrl}`,
    `Portal: ${dashboardUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
