import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAuthWelcomeReferrer(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const referrerName = getString(variables, 'referrerName', 'Tu perfil de referido');
  const dashboardUrl = getString(variables, 'dashboardUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Tu perfil de referido ya está activo en Yo Te Invito';
  const previewText =
    'Ya podés vincularte con productoras, recibir propuestas y seguir tus métricas desde el portal.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">¡Bienvenido a <strong>Yo Te Invito</strong>!</p>
    <p style="margin:0 0 12px;">Tu perfil de referido <strong>${escapeHtml(referrerName)}</strong> ya está activo. Los acuerdos comerciales y pagos entre productoras y referidos son externos a la plataforma.</p>
    <p style="margin:0 0 8px;">Desde tu portal vas a poder:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li style="margin-bottom:6px;">Ver propuestas y acuerdos activos.</li>
      <li style="margin-bottom:6px;">Acceder a tus links de referido.</li>
      <li>Consultar comisiones según los acuerdos aceptados.</li>
    </ul>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ir al portal referido',
    ctaUrl: dashboardUrl,
    supportEmail,
    footerNote: `Yo Te Invito no administra pagos entre productoras y referidos. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `Tu perfil de referido (${referrerName}) ya está activo.`,
    '',
    `Portal: ${dashboardUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
