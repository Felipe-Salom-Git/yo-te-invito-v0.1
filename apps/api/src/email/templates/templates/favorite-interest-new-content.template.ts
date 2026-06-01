import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderFavoriteInterestNewContent(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const contentTitle = getString(variables, 'contentTitle', 'una nueva propuesta');
  const categoryName = getString(variables, 'categoryName', 'tus intereses');
  const subcategoryName = getString(variables, 'subcategoryName');
  const city = getString(variables, 'city');
  const contentUrl = getString(variables, 'contentUrl');
  const preferencesUrl = getString(variables, 'preferencesUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Nuevo recomendado para vos';
  const previewText = `Hay contenido nuevo en ${categoryName} que coincide con tus preferencias.`;

  const interestLine = subcategoryName
    ? `${escapeHtml(categoryName)} · ${escapeHtml(subcategoryName)}`
    : escapeHtml(categoryName);

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">Encontramos una propuesta que puede interesarte: <strong>${escapeHtml(contentTitle)}</strong>.</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li>Interés: ${interestLine}</li>
      ${city ? `<li>Ciudad: ${escapeHtml(city)}</li>` : ''}
    </ul>
    <p style="margin:0 0 12px;font-size:12px;color:#9ca3af;">Podés ajustar ciudades y categorías en tus preferencias cuando quieras.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver recomendación',
    ctaUrl: contentUrl,
    supportEmail,
    footerNote: `Recomendación según tus intereses. Preferencias: ${preferencesUrl} · © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `Nuevo recomendado: ${contentTitle} (${categoryName}${subcategoryName ? ` · ${subcategoryName}` : ''}).`,
    city ? `Ciudad: ${city}` : '',
    '',
    `Ver: ${contentUrl}`,
    `Preferencias: ${preferencesUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
