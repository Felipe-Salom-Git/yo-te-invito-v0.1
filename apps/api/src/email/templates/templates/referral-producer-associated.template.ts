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

export function renderReferralProducerAssociated(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const referrerName = getString(variables, 'referrerName', 'ahí');
  const producerName = getString(variables, 'producerName', 'la productora');
  const referrerDashboardUrl = getString(variables, 'referrerDashboardUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Quedaste asociado a ${producerName} en Yo Te Invito`;
  const previewText = 'Ya podés gestionar tu vínculo con esta productora desde tu portal de referido.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(referrerName)},</p>
    <p style="margin:0 0 12px;">Te informamos que quedaste asociado a <strong>${escapeHtml(producerName)}</strong> dentro de Yo Te Invito.</p>
    <p style="margin:0 0 12px;">Desde tu portal podés revisar la relación, propuestas comerciales y movimientos registrados según los acuerdos que se generen entre las partes.</p>
    ${referralDisclaimerHtml()}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ir a mi portal referido',
    ctaUrl: referrerDashboardUrl,
    supportEmail,
    footerNote: `© ${getCurrentYear()} Yo Te Invito.`,
  });

  const text = [
    `Hola ${referrerName},`,
    '',
    `Quedaste asociado a ${producerName}.`,
    '',
    REFERRAL_EMAIL_DISCLAIMER_TEXT,
    '',
    `Portal: ${referrerDashboardUrl}`,
    '',
    `¿Ayuda? ${supportEmail}`,
  ].join('\n');

  return { subject, previewText, html, text };
}
