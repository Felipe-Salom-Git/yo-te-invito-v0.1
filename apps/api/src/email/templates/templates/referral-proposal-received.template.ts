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

export function renderReferralProposalReceived(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const referrerName = getString(variables, 'referrerName', 'ahí');
  const producerName = getString(variables, 'producerName', 'Una productora');
  const eventTitle = getString(variables, 'eventTitle', 'un evento');
  const commissionType = getString(variables, 'commissionType');
  const commissionValue = getString(variables, 'commissionValue');
  const proposalUrl = getString(variables, 'proposalUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Recibiste una propuesta de ${producerName}`;
  const previewText = 'Revisá las condiciones de la propuesta antes de aceptarla.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(referrerName)},</p>
    <p style="margin:0 0 12px;"><strong>${escapeHtml(producerName)}</strong> te envió una propuesta comercial para participar como referido en <strong>${escapeHtml(eventTitle)}</strong>.</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      ${commissionType ? `<li>Tipo de comisión: ${escapeHtml(commissionType)}</li>` : ''}
      ${commissionValue ? `<li>Valor: ${escapeHtml(commissionValue)}</li>` : ''}
    </ul>
    <p style="margin:0 0 12px;">Antes de aceptar, revisá bien las condiciones. Al aceptar, se podrá registrar un acuerdo operativo en Yo Te Invito.</p>
    ${referralDisclaimerHtml()}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Revisar propuesta',
    ctaUrl: proposalUrl,
    supportEmail,
    footerNote: `© ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${referrerName},`,
    '',
    `${producerName} te envió una propuesta para ${eventTitle}.`,
    commissionType && commissionValue ? `${commissionType}: ${commissionValue}` : '',
    '',
    REFERRAL_EMAIL_DISCLAIMER_TEXT,
    '',
    `Revisar: ${proposalUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
