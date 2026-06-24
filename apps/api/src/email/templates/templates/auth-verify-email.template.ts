import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getAppUrl,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAuthVerifyEmail(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const verifyUrl =
    getString(variables, 'verifyUrl') ||
    `${getAppUrl()}/verify-email?token=invalid`;
  const expiresIn = getString(variables, 'expiresIn', '24 horas');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Confirmá tu cuenta en Yo Te Invito';
  const previewText = 'Verificá tu email para activar tu cuenta.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">Gracias por registrarte en <strong>Yo Te Invito</strong>.</p>
    <p style="margin:0 0 12px;">Para activar tu cuenta, confirmá tu email haciendo click en el siguiente botón. El enlace vence en <strong>${escapeHtml(expiresIn)}</strong>.</p>
    <p style="margin:0;font-size:13px;color:#9ca3af;">Si no creaste esta cuenta, podés ignorar este mensaje.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Confirmar mi cuenta',
    ctaUrl: verifyUrl,
    supportEmail,
    footerNote: `Yo Te Invito — ${supportEmail}`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    'Gracias por registrarte en Yo Te Invito.',
    '',
    'Para activar tu cuenta, confirmá tu email con este enlace:',
    verifyUrl,
    '',
    `El enlace vence en ${expiresIn}.`,
    '',
    'Si no creaste esta cuenta, podés ignorar este mensaje.',
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
