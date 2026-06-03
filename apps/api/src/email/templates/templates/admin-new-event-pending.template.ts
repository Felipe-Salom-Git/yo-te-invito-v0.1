import type { RenderedEmailTemplate } from '../email-template.types';
import {
  adminEmailFooterYear,
} from '../admin-operational-email.util';
import {
  escapeHtml,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAdminNewEventPending(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const eventTitle = getString(variables, 'eventTitle', 'Evento');
  const producerName = getString(variables, 'producerName', 'Productora');
  const categoryName = getString(variables, 'categoryName');
  const city = getString(variables, 'city');
  const createdAt = getString(variables, 'createdAt');
  const adminEventUrl = getString(variables, 'adminEventUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());
  const operationsEmail = getString(variables, 'operationsEmail', supportEmail);

  const subject = `Nuevo evento pendiente de revisión: ${eventTitle}`;
  const previewText = 'Una productora envió un evento que requiere revisión administrativa.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola,</p>
    <p style="margin:0 0 12px;">Hay un nuevo evento pendiente de revisión en Yo Te Invito.</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li>Evento: ${escapeHtml(eventTitle)}</li>
      <li>Productora: ${escapeHtml(producerName)}</li>
      ${categoryName ? `<li>Categoría: ${escapeHtml(categoryName)}</li>` : ''}
      ${city ? `<li>Ciudad: ${escapeHtml(city)}</li>` : ''}
      ${createdAt ? `<li>Enviado: ${escapeHtml(createdAt)}</li>` : ''}
    </ul>
    <p style="margin:0;">Revisá la información cargada antes de aprobar o solicitar cambios.</p>
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">Alerta operativa interna. Si no corresponde a tu área, reenviá a ${escapeHtml(operationsEmail)}.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    headline: 'Evento pendiente',
    bodyHtml,
    ctaLabel: 'Revisar evento',
    ctaUrl: adminEventUrl,
    supportEmail,
    footerNote: `© ${adminEmailFooterYear()} Yo Te Invito.`,
  });

  const text = [
    'Nuevo evento pendiente de revisión',
    '',
    `Evento: ${eventTitle}`,
    `Productora: ${producerName}`,
    categoryName ? `Categoría: ${categoryName}` : '',
    city ? `Ciudad: ${city}` : '',
    createdAt ? `Enviado: ${createdAt}` : '',
    '',
    `Revisar: ${adminEventUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
