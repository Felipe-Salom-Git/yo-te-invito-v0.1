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

export function renderReferralCommissionGenerated(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const referrerName = getString(variables, 'referrerName', 'ahí');
  const producerName = getString(variables, 'producerName', 'la productora');
  const eventTitle = getString(variables, 'eventTitle', 'un evento');
  const commissionAmount = getString(variables, 'commissionAmount');
  const currency = getString(variables, 'currency', 'ARS');
  const saleReference = getString(variables, 'saleReference');
  const commissionUrl = getString(variables, 'commissionUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Se registró una comisión generada para ${eventTitle}`;
  const previewText =
    'Hay una comisión generada registrada por una venta atribuida a tu actividad como referido.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(referrerName)},</p>
    <p style="margin:0 0 12px;">Se registró una <strong>comisión generada</strong> por una venta atribuida en <strong>${escapeHtml(eventTitle)}</strong> (${escapeHtml(producerName)}).</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li>Monto informado: ${escapeHtml(currency)} ${escapeHtml(commissionAmount)}</li>
      ${saleReference ? `<li>Referencia de venta: ${escapeHtml(saleReference)}</li>` : ''}
    </ul>
    <p style="margin:0 0 12px;">Este registro es operativo dentro de Yo Te Invito. El cobro debe gestionarse directamente con la productora según el acuerdo entre las partes.</p>
    ${referralDisclaimerHtml()}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver comisión',
    ctaUrl: commissionUrl,
    supportEmail,
    footerNote: `© ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${referrerName},`,
    '',
    `Comisión generada registrada para ${eventTitle}: ${currency} ${commissionAmount}.`,
    saleReference ? `Referencia: ${saleReference}` : '',
    '',
    REFERRAL_EMAIL_DISCLAIMER_TEXT,
    '',
    `Ver: ${commissionUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
