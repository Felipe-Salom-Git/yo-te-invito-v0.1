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

export function renderReferralProposalAccepted(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const producerName = getString(variables, 'producerName', 'ahí');
  const referrerName = getString(variables, 'referrerName', 'El referido');
  const eventTitle = getString(variables, 'eventTitle', 'tu evento');
  const agreementUrl = getString(variables, 'agreementUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `${referrerName} aceptó tu propuesta comercial`;
  const previewText = `Se registró un acuerdo operativo para ${eventTitle}.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(producerName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(referrerName)}</strong> aceptó tu propuesta para <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p style="margin:0 0 12px;">Podés revisar el acuerdo y el link de atribución desde tu portal de productora.</p>
    ${referralDisclaimerHtml()}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver acuerdo',
    ctaUrl: agreementUrl,
    supportEmail,
    footerNote: `© ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${producerName},`,
    '',
    `${referrerName} aceptó la propuesta para ${eventTitle}.`,
    '',
    REFERRAL_EMAIL_DISCLAIMER_TEXT,
    '',
    `Ver acuerdo: ${agreementUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
