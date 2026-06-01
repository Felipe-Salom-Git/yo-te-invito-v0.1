import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAuthVerifyEmail(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const verifyUrl = getString(variables, 'verifyUrl');
  const expiresIn = getString(variables, 'expiresIn', '24 horas');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Verifica tu email — Yo Te Invito';
  const previewText = 'Activá tu cuenta con un clic. El enlace tiene validez limitada.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">Para activar tu cuenta en <strong>Yo Te Invito</strong>, verificá tu dirección de email.</p>
    <p style="margin:0 0 12px;">Hacé clic en el botón de abajo. El enlace vence en <strong>${escapeHtml(expiresIn)}</strong>.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">Si no creaste una cuenta, podés ignorar este mensaje.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Verificar mi email',
    ctaUrl: verifyUrl,
    supportEmail,
    footerNote: `Este email fue enviado por Yo Te Invito. © ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    'Verificá tu email para activar tu cuenta en Yo Te Invito.',
    '',
    `Enlace (vence en ${expiresIn}): ${verifyUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
