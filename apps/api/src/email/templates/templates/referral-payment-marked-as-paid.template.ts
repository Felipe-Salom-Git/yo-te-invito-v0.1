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

export function renderReferralPaymentMarkedAsPaid(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const referrerName = getString(variables, 'referrerName', 'ahí');
  const producerName = getString(variables, 'producerName', 'la productora');
  const paidAmount = getString(variables, 'paidAmount');
  const currency = getString(variables, 'currency', 'ARS');
  const markedPaidAt = getString(variables, 'markedPaidAt');
  const paymentRequestUrl = getString(variables, 'paymentRequestUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = 'La productora marcó un pago como realizado';
  const previewText =
    'Se registró en Yo Te Invito que la productora marcó el pago como realizado.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(referrerName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(producerName)}</strong> marcó como realizado un pago registrado por <strong>${escapeHtml(currency)} ${escapeHtml(paidAmount)}</strong>${markedPaidAt ? ` el ${escapeHtml(markedPaidAt)}` : ''}.</p>
    <p style="margin:0 0 12px;">Este aviso es un registro operativo. Yo Te Invito no ejecutó ni garantizó la transferencia de fondos.</p>
    ${referralDisclaimerHtml()}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver detalle',
    ctaUrl: paymentRequestUrl,
    supportEmail,
    footerNote: `© ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${referrerName},`,
    '',
    `${producerName} marcó un pago como realizado: ${currency} ${paidAmount}.`,
    markedPaidAt ? `Fecha: ${markedPaidAt}` : '',
    '',
    REFERRAL_EMAIL_DISCLAIMER_TEXT,
    '',
    `Ver detalle: ${paymentRequestUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
