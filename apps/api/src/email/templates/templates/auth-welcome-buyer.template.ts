import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getAppUrl,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAuthWelcomeBuyer(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const appUrl = getAppUrl();
  const userName = getString(variables, 'userName', 'ahí');
  const portalUrl = getString(variables, 'portalUrl', `${appUrl}/me`);
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Bienvenido a Yo Te Invito, ${userName}`;
  const previewText =
    'Tu cuenta ya está lista para descubrir eventos, experiencias y servicios en Yo Te Invito.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">¡Bienvenido a <strong>Yo Te Invito</strong>!</p>
    <p style="margin:0 0 12px;">Tu cuenta ya está activa. Desde ahora podés descubrir eventos, experiencias gastronómicas, excursiones, rentals y propuestas seleccionadas.</p>
    <p style="margin:0 0 8px;">Con tu cuenta vas a poder:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li style="margin-bottom:6px;">Comprar entradas y acceder a tus tickets digitales.</li>
      <li style="margin-bottom:6px;">Guardar eventos y experiencias para ver más tarde.</li>
      <li style="margin-bottom:6px;">Seguir productoras y locales que te interesen.</li>
      <li>Recibir alertas importantes sobre tus compras y actividades.</li>
    </ul>
    <p style="margin:0;">Te recomendamos completar tus preferencias para ver propuestas más relevantes.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ir a mi cuenta',
    ctaUrl: portalUrl,
    supportEmail,
    footerNote: `Este email fue enviado por Yo Te Invito. © ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    '¡Bienvenido a Yo Te Invito!',
    '',
    'Tu cuenta ya está activa.',
    '',
    `Ir a mi cuenta: ${portalUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
