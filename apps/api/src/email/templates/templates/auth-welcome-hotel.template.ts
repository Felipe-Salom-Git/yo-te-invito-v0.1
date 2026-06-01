import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAuthWelcomeHotel(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const hotelName = getString(variables, 'hotelName', 'Tu hotel');
  const dashboardUrl = getString(variables, 'dashboardUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Tu perfil de hotel ya está activo en Yo Te Invito';
  const previewText =
    'Ya podés completar tu ficha informativa y preparar tu presencia pública en la plataforma.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">¡Bienvenido a <strong>Yo Te Invito</strong>!</p>
    <p style="margin:0 0 12px;">Tu acceso como hotel <strong>${escapeHtml(hotelName)}</strong> ya está activo. En esta etapa, la vertical hoteles funciona como una ficha pública informativa.</p>
    <p style="margin:0 0 8px;">Desde tu portal vas a poder:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li style="margin-bottom:6px;">Completar la información de tu hotel.</li>
      <li style="margin-bottom:6px;">Cargar imágenes y datos de contacto.</li>
      <li>Mantener actualizada tu ficha pública.</li>
    </ul>
    <p style="margin:0;font-size:13px;color:#9ca3af;">Por ahora, Yo Te Invito no gestiona reservas hoteleras ni pagos de alojamiento desde la plataforma.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ir al portal hotel',
    ctaUrl: dashboardUrl,
    supportEmail,
    footerNote: `Este email fue enviado por Yo Te Invito. © ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `Tu hotel (${hotelName}) ya está activo en Yo Te Invito.`,
    '',
    `Portal: ${dashboardUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
