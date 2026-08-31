import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getBoolean,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderActivityCouponQr(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const operatorName = getString(variables, 'operatorName', 'una Actividad');
  const eventTitle = getString(variables, 'eventTitle', 'Actividad');
  const couponTitle = getString(variables, 'couponTitle', 'Cupón');
  const benefitLabel = getString(variables, 'benefitLabel', couponTitle);
  const qrImageUrl = getString(variables, 'qrImageUrl');
  const shortCode = getString(variables, 'shortCode');
  const validTo = getString(variables, 'validTo');
  const conditions = getString(
    variables,
    'conditions',
    'Presentá este QR en la Actividad para aplicar el beneficio. Este cupón es de uso único.',
  );
  const claimUrl = getString(variables, 'claimUrl');
  const accountUrl = getString(variables, 'accountUrl');
  const hasAccount = getBoolean(variables, 'hasAccount');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Tu cupón para ${eventTitle} está listo`;
  const previewText = 'Presentá tu QR en la Actividad para usar el beneficio.';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    <p style="margin:0 0 12px;">Tu cupón de Actividades ya está listo.</p>
    <p style="margin:0 0 8px;"><strong>${escapeHtml(operatorName)}</strong> — ${escapeHtml(eventTitle)}</p>
    <p style="margin:0 0 12px;">Beneficio: <strong>${escapeHtml(benefitLabel)}</strong></p>
    ${validTo ? `<p style="margin:0 0 12px;">Válido hasta: <strong>${escapeHtml(validTo)}</strong></p>` : ''}
    <p style="margin:0 0 12px;font-size:14px;color:#e5e7eb;">Presentá este QR en la Actividad para aplicar el beneficio.</p>
    ${qrImageUrl ? `<p style="text-align:center;margin:20px 0;"><img src="${escapeHtml(qrImageUrl)}" alt="Código QR" width="280" height="280" style="border:1px solid #1f2937;border-radius:8px;" /></p>` : ''}
    ${shortCode ? `<p style="margin:0 0 12px;font-family:monospace;font-size:14px;color:#22c55e;">Código corto: ${escapeHtml(shortCode)}</p>` : ''}
    ${claimUrl ? `<p style="margin:0 0 12px;font-size:13px;color:#9ca3af;">Si no ves el QR, abrí este enlace:<br /><a href="${escapeHtml(claimUrl)}" style="color:#22c55e;word-break:break-all;">${escapeHtml(claimUrl)}</a></p>` : ''}
    <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;">${escapeHtml(conditions)}</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    bodyHtml,
    ctaLabel: 'Ver mi QR',
    ctaUrl: claimUrl,
    ...(hasAccount && accountUrl
      ? { secondaryCtaLabel: 'Ver en mi cuenta', secondaryCtaUrl: accountUrl }
      : {}),
    supportEmail,
    footerNote: `Cupón de Actividades en Yo Te Invito. © ${getCurrentYear()}.`,
  });

  const text = [
    `Hola ${userName},`,
    '',
    'Tu cupón de Actividades ya está listo.',
    `${operatorName} — ${eventTitle}`,
    `Beneficio: ${benefitLabel}`,
    validTo ? `Válido hasta: ${validTo}` : '',
    'Presentá este QR en la Actividad para aplicar el beneficio.',
    shortCode ? `Código corto: ${shortCode}` : '',
    claimUrl ? `Si no ves el QR, abrí este enlace: ${claimUrl}` : '',
    conditions,
    '',
    claimUrl ? `Ver mi QR: ${claimUrl}` : '',
    hasAccount && accountUrl ? `Mi cuenta: ${accountUrl}` : '',
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
