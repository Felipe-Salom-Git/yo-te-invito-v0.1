import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
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
    'Presentá este QR en el local. Sujeto a disponibilidad del restaurante.',
  );
  const accountUrl = getString(variables, 'accountUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const bodyHtml = `
    <p style="margin:0 0 12px;">Hola ${escapeHtml(userName)},</p>
    ${opts.introHtml}
    <p style="margin:0 0 8px;"><strong>${escapeHtml(gastroName)}</strong></p>
    <p style="margin:0 0 12px;">Beneficio: <strong>${escapeHtml(discountLabel)}</strong></p>
    ${discountDescription ? `<p style="margin:0 0 12px;color:#9ca3af;">${escapeHtml(discountDescription)}</p>` : ''}
    ${validTo ? `<p style="margin:0 0 12px;">Válido hasta: <strong>${escapeHtml(validTo)}</strong></p>` : ''}
    ${qrImageUrl ? `<p style="text-align:center;margin:20px 0;"><img src="${escapeHtml(qrImageUrl)}" alt="Código QR" width="280" height="280" style="border:1px solid #1f2937;border-radius:8px;" /></p>` : ''}
    ${qrCode ? `<p style="margin:0 0 12px;font-family:monospace;font-size:14px;word-break:break-all;color:#22c55e;">Código alternativo: ${escapeHtml(qrCode)}</p>` : ''}
    <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;">${escapeHtml(conditions)}</p>
  `;

  const html = renderBaseEmailLayout({
    previewText: opts.previewText,
    bodyHtml,
    ctaLabel: 'Ver en Mi cuenta',
    ctaUrl: accountUrl,
    supportEmail,
    footerNote: opts.footerNote,
  });

  const text = [
    `Hola ${userName},`,
    '',
    `${gastroName} — ${discountLabel}`,
    discountDescription,
    validTo ? `Válido hasta: ${validTo}` : '',
    qrCode ? `Código: ${qrCode}` : '',
    conditions,
    '',
    accountUrl ? `Mi cuenta: ${accountUrl}` : '',
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
    previewText: 'Presentá este QR en el local para usar tu beneficio.',
    introHtml:
      '<p style="margin:0 0 12px;">Tu descuento ya está listo. Presentá el QR en el local para usarlo.</p>',
    footerNote: `Descuento solicitado en Yo Te Invito. © ${getCurrentYear()}.`,
  });
}

export function renderGastroDiscountQrCourtesy(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const gastroName = getString(variables, 'gastroName', 'Un local');
  const courtesyMessage = getString(variables, 'courtesyMessage');
  const introHtml = courtesyMessage
    ? `<p style="margin:0 0 12px;">${escapeHtml(courtesyMessage)}</p>`
    : '<p style="margin:0 0 12px;">Tenés un beneficio especial para usar en el local.</p>';

  return renderGastroDiscountQrEmail(variables, {
    subject: `${gastroName} te envió una cortesía`,
    previewText: 'Tenés un beneficio especial para usar en el local.',
    introHtml,
    footerNote: `Cortesía exclusiva — no publicada en la ficha pública. © ${getCurrentYear()}.`,
  });
}
