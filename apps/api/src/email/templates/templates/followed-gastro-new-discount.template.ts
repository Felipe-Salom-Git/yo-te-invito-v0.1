import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderFollowedGastroNewDiscount(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const gastroName = getString(variables, 'gastroName', 'Un local');
  const discountTitle = getString(variables, 'discountTitle', 'un descuento');
  const discountValue = getString(variables, 'discountValue');
  const validUntil = getString(variables, 'validUntil');
  const gastroUrl = getString(variables, 'gastroUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Nuevo descuento en ${gastroName}`;
  const previewText = 'Un local que seguís activó un descuento.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(gastroName)}</strong> publicó un descuento: <strong>${escapeHtml(discountTitle)}</strong>${discountValue ? ` (${escapeHtml(discountValue)})` : ''}.</p>
    ${validUntil ? `<p style="margin:0 0 12px;">Válido hasta: ${escapeHtml(validUntil)}</p>` : ''}
    <p style="margin:0;">Revisá condiciones y cómo usarlo desde la ficha del descuento.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver descuento',
    ctaUrl: gastroUrl,
    supportEmail,
    footerNote: `Alerta de local seguido en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `${gastroName} publicó: ${discountTitle}${discountValue ? ` (${discountValue})` : ''}.`,
    validUntil ? `Válido hasta: ${validUntil}` : '',
    '',
    `Ver descuento: ${gastroUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
