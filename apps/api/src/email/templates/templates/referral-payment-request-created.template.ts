import type { RenderedEmailTemplate } from '../email-template.types';
import {
  referralDisclaimerHtml,
  REFERRAL_EMAIL_DISCLAIMER_TEXT,
} from '../referral-email-layout.util';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderReferralPaymentRequestCreated(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const producerName = getString(variables, 'producerName', 'ahí');
  const referrerName = getString(variables, 'referrerName', 'Un referido');
  const requestedAmount = getString(variables, 'requestedAmount');
  const currency = getString(variables, 'currency', 'ARS');
  const paymentRequestUrl = getString(variables, 'paymentRequestUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'Nueva solicitud de pago de un referido';
  const previewText =
    'Un referido registró una solicitud de pago para seguimiento entre las partes.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(producerName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(referrerName)}</strong> registró una solicitud de pago por <strong>${escapeHtml(currency)} ${escapeHtml(requestedAmount)}</strong>.</p>
    <p style="margin:0 0 12px;">La solicitud queda registrada en Yo Te Invito para seguimiento. Yo Te Invito no realiza ni garantiza el pago; cualquier liquidación es un acuerdo externo entre productora y referido.</p>
    ${referralDisclaimerHtml()}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver solicitud',
    ctaUrl: paymentRequestUrl,
    supportEmail,
    footerNote: `© ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${producerName},`,
    '',
    `${referrerName} registró una solicitud de pago: ${currency} ${requestedAmount}.`,
    '',
    REFERRAL_EMAIL_DISCLAIMER_TEXT,
    '',
    `Ver solicitud: ${paymentRequestUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
