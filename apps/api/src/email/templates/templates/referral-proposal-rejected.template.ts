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

export function renderReferralProposalRejected(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const producerName = getString(variables, 'producerName', 'ahí');
  const referrerName = getString(variables, 'referrerName', 'El referido');
  const eventTitle = getString(variables, 'eventTitle', 'tu evento');
  const proposalUrl = getString(variables, 'proposalUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `${referrerName} rechazó tu propuesta comercial`;
  const previewText = `La propuesta para ${eventTitle} no fue aceptada.`;

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(producerName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(referrerName)}</strong> rechazó tu propuesta para <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <p style="margin:0 0 12px;">Podés revisar el estado desde tu portal y enviar una nueva propuesta si corresponde.</p>
    ${referralDisclaimerHtml()}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver propuesta',
    ctaUrl: proposalUrl,
    supportEmail,
    footerNote: `© ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${producerName},`,
    '',
    `${referrerName} rechazó la propuesta para ${eventTitle}.`,
    '',
    REFERRAL_EMAIL_DISCLAIMER_TEXT,
    '',
    `Ver: ${proposalUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
