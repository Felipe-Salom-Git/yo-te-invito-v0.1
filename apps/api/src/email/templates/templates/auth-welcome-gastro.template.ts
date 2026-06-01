import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAuthWelcomeGastro(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const businessName = getString(variables, 'businessName', 'Tu local');
  const dashboardUrl = getString(variables, 'dashboardUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Tu espacio gastronómico ya está activo en Yo Te Invito';
  const previewText =
    'Ya podés preparar tu ficha, publicar contenido y gestionar descuentos para tus clientes.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">¡Bienvenido a <strong>Yo Te Invito</strong>!</p>
    <p style="margin:0 0 12px;">Tu acceso gastronómico de <strong>${escapeHtml(businessName)}</strong> ya está activo. Desde tu portal vas a poder administrar tu local, publicar contenido, crear descuentos y responder reseñas.</p>
    <p style="margin:0 0 8px;">Desde tu portal vas a poder:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li style="margin-bottom:6px;">Completar y actualizar la información de tu local.</li>
      <li style="margin-bottom:6px;">Publicar contenido gastronómico.</li>
      <li style="margin-bottom:6px;">Crear descuentos y promociones.</li>
      <li>Revisar validaciones y gestionar reseñas.</li>
    </ul>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ir al portal gastronómico',
    ctaUrl: dashboardUrl,
    supportEmail,
    footerNote: `Este email fue enviado por Yo Te Invito. © ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `Tu local (${businessName}) ya está activo en Yo Te Invito.`,
    '',
    `Portal: ${dashboardUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
