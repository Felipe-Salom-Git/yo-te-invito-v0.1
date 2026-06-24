import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getBoolean,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

function renderGastroDiscountQrEmail(
  variables: Record<string, unknown>,
  opts: { subject: string; previewText: string; introHtml: string; footerNote: string },
): RenderedEmailTemplate {
  const userName = getString(variables, 'userName', 'ahí');
  const gastroName = getString(variables, 'gastroName', 'Un local');
  const discountTitle = getString(variables, 'discountTitle', 'Descuento');
  const discountLabel = getString(variables, 'discountLabel', discountTitle);
  const discountDescription = getString(variables, 'discountDescription');
  const qrImageUrl = getString(variables, 'qrImageUrl');
  const qrCode = getString(variables, 'qrCode');
  const validTo = getString(variables, 'validTo');
  const conditions = getString(
    variables,
    'conditions',
    'Presentá este QR en el local para aplicar el beneficio. Este cupón es de uso único.',
  );
  const claimUrl = getString(variables, 'claimUrl');
  const accountUrl = getString(variables, 'accountUrl');
  const hasAccount = getBoolean(variables, 'hasAccount');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    ${opts.introHtml}
    <p style="margin:0 0 8px;"><strong>${escapeHtml(gastroName)}</strong></p>
    <p style="margin:0 0 12px;">Beneficio: <strong>${escapeHtml(discountLabel)}</strong></p>
    ${discountDescription ? `<p style="margin:0 0 12px;color:#9ca3af;">${escapeHtml(discountDescription)}</p>` : ''}
    ${validTo ? `<p style="margin:0 0 12px;">Válido hasta: <strong>${escapeHtml(validTo)}</strong></p>` : ''}
    <p style="margin:0 0 12px;font-size:14px;color:#e5e7eb;">Presentá este QR en el local para aplicar el beneficio.</p>
    ${qrImageUrl ? `<p style="text-align:center;margin:20px 0;"><img src="${escapeHtml(qrImageUrl)}" alt="Código QR" width="280" height="280" style="border:1px solid #1f2937;border-radius:8px;" /></p>` : ''}
    ${qrCode ? `<p style="margin:0 0 12px;font-family:monospace;font-size:14px;word-break:break-all;color:#22c55e;">Código alternativo: ${escapeHtml(qrCode)}</p>` : ''}
    <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;">${escapeHtml(conditions)}</p>
  `;

  const html = renderBaseEmailLayout({
    previewText: opts.previewText,
    bodyHtml,
    ctaLabel: 'Ver mi QR',
    ctaUrl: claimUrl,
    ...(hasAccount && accountUrl
      ? { secondaryCtaLabel: 'Ver en mi cuenta', secondaryCtaUrl: accountUrl }
      : {}),
    supportEmail,
    footerNote: opts.footerNote,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `${gastroName} — ${discountLabel}`,
    discountDescription,
    validTo ? `Válido hasta: ${validTo}` : '',
    'Presentá este QR en el local para aplicar el beneficio.',
    qrCode ? `Código: ${qrCode}` : '',
    conditions,
    '',
    claimUrl ? `Ver mi QR: ${claimUrl}` : '',
    hasAccount && accountUrl ? `Mi cuenta: ${accountUrl}` : '',
    '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject: opts.subject, previewText: opts.previewText, html, text };
}

export function renderGastroDiscountQrRequested(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const gastroName = getString(variables, 'gastroName', 'Un local');
  return renderGastroDiscountQrEmail(variables, {
    subject: `Tu descuento para ${gastroName} está listo`,
    previewText: 'Presentá tu QR en el local para usar el beneficio.',
    introHtml:
      '<p style="margin:0 0 12px;">Tu descuento ya está listo.</p>',
    footerNote: `Descuento solicitado en Yo Te Invito. © ${getCurrentYear()}.`,
  });
}

export function renderGastroDiscountQrCourtesy(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const gastroName = getString(variables, 'gastroName', 'Un local');
  const courtesyMessage = getString(variables, 'courtesyMessage');
  const introHtml = courtesyMessage
    ? `<p style="margin:0 0 12px;">Recibiste una cortesía gastronómica de <strong>${escapeHtml(gastroName)}</strong>.</p><p style="margin:0 0 12px;color:#9ca3af;">${escapeHtml(courtesyMessage)}</p>`
    : `<p style="margin:0 0 12px;">Recibiste una cortesía gastronómica de <strong>${escapeHtml(gastroName)}</strong>.</p>`;

  return renderGastroDiscountQrEmail(variables, {
    subject: 'Tenés una cortesía gastronómica en Yo Te Invito',
    previewText: 'Presentá tu QR en el local para usar el beneficio.',
    introHtml,
    footerNote: `Cortesía exclusiva — no publicada en la ficha pública. © ${getCurrentYear()}.`,
  });
}
