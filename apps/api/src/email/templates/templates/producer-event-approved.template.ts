import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getAppUrl,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderProducerEventApproved(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const appUrl = getAppUrl();
  const producerName = getString(variables, 'producerName', 'Productor/a');
  const eventTitle = getString(variables, 'eventTitle', 'Tu evento');
  const eventUrl = getString(variables, 'eventUrl', `${appUrl}/producer/events`);
  const dashboardUrl = getString(variables, 'dashboardUrl', `${appUrl}/producer`);
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const eventDate = getString(variables, 'eventDate');
  const eventTime = getString(variables, 'eventTime');
  const venueName = getString(variables, 'venueName');

  const subject = `Tu evento fue aprobado: ${eventTitle}`;
  const previewText =
    'Administración aprobó tu evento. Ya podés revisar su estado desde tu portal.';

  const detailRows: string[] = [`<li><strong>Evento:</strong> ${escapeHtml(eventTitle)}</li>`];
  if (eventDate) detailRows.push(`<li><strong>Fecha:</strong> ${escapeHtml(eventDate)}</li>`);
  if (eventTime) detailRows.push(`<li><strong>Hora:</strong> ${escapeHtml(eventTime)}</li>`);
  if (venueName) detailRows.push(`<li><strong>Lugar:</strong> ${escapeHtml(venueName)}</li>`);

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(producerName)},</p>
    <p style="margin:0 0 12px;">¡Buenas noticias! Tu evento <strong>${escapeHtml(eventTitle)}</strong> fue aprobado por administración.</p>
    <p style="margin:0 0 16px;">Podés ingresar a tu portal para revisar la información final, estado de publicación, entradas y configuración del evento.</p>
    <p style="margin:0 0 8px;font-weight:bold;">Datos del evento</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">${detailRows.join('')}</ul>
    <p style="margin:0;">Te recomendamos verificar textos, imágenes, ubicación y tandas antes de compartirlo con tu público.</p>
    <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">Portal productor: <a href="${escapeHtml(dashboardUrl)}" style="color:#22c55e;">${escapeHtml(dashboardUrl)}</a></p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver evento',
    ctaUrl: eventUrl,
    supportEmail,
    footerNote: `Actualización sobre el estado de tu evento en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${producerName},`,
    '',
    `Tu evento "${eventTitle}" fue aprobado por administración.`,
    '',
    `Ver evento: ${eventUrl}`,
    `Portal: ${dashboardUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
