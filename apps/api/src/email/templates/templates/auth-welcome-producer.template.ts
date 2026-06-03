import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAuthWelcomeProducer(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const producerName = getString(variables, 'producerName', 'Tu productora');
  const dashboardUrl = getString(variables, 'dashboardUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Tu perfil de productora ya está activo en Yo Te Invito';
  const previewText =
    'Ya podés comenzar a preparar tu perfil, cargar eventos y gestionar tu presencia en la plataforma.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">¡Bienvenido a <strong>Yo Te Invito</strong>!</p>
    <p style="margin:0 0 12px;">Tu acceso como productora <strong>${escapeHtml(producerName)}</strong> ya está activo. Desde tu portal vas a poder gestionar tu perfil, crear eventos, administrar entradas y revisar métricas.</p>
    <p style="margin:0 0 8px;">Desde tu portal vas a poder:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li style="margin-bottom:6px;">Completar la identidad pública de tu productora.</li>
      <li style="margin-bottom:6px;">Crear y editar eventos.</li>
      <li style="margin-bottom:6px;">Configurar tipos de entrada y tandas.</li>
      <li>Revisar métricas, reseñas y estado de publicaciones.</li>
    </ul>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ir al portal productor',
    ctaUrl: dashboardUrl,
    supportEmail,
    footerNote: `Este email fue enviado por Yo Te Invito. © ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `Tu perfil de productora (${producerName}) ya está activo.`,
    '',
    `Portal: ${dashboardUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
