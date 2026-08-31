import type { RenderedEmailTemplate } from '../email-template.types';
import {
  escapeHtml,
  getCurrentYear,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAdminCampaign(variables: Record<string, unknown>): RenderedEmailTemplate {
  const subject = getString(variables, 'subject', 'Novedades de Yo Te Invito');
  const headline = getString(variables, 'headline', subject);
  const body = getString(variables, 'body');
  const contentTitle = getString(variables, 'contentTitle');
  const contentBenefit = getString(variables, 'contentBenefit');
  const imageUrl = getString(variables, 'imageUrl');
  const ctaLabel = getString(variables, 'ctaLabel', 'Ver más');
  const ctaUrl = getString(variables, 'ctaUrl');
  const unsubscribeUrl = getString(variables, 'unsubscribeUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const previewText = headline;
  const benefitLine = contentBenefit
    ? `<p style="margin:0 0 12px;"><strong>${escapeHtml(contentBenefit)}</strong></p>`
    : '';
  const titleLine = contentTitle
    ? `<p style="margin:0 0 12px;">${escapeHtml(contentTitle)}</p>`
    : '';
  const imageLine =
    imageUrl.startsWith('https://')
      ? `<p style="margin:0 0 16px;"><img src="${escapeHtml(imageUrl)}" alt="" width="560" style="max-width:100%;height:auto;border-radius:8px;" /></p>`
      : '';

  const bodyHtml = `
    ${body
      .split('\n')
      .map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`)
      .join('')}
    ${imageLine}
    ${titleLine}
    ${benefitLine}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    headline,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    secondaryCtaLabel: unsubscribeUrl ? 'Darse de baja de emails promocionales' : undefined,
    secondaryCtaUrl: unsubscribeUrl || undefined,
    supportEmail,
    footerNote: `Este correo es promocional. No afecta tickets, verificación ni reclamos QR. © ${getCurrentYear()}.`,
  });

  const text = [
    headline,
    '',
    body,
    contentTitle,
    contentBenefit,
    ctaUrl ? `${ctaLabel}: ${ctaUrl}` : '',
    unsubscribeUrl ? `Darse de baja: ${unsubscribeUrl}` : '',
    `¿Ayuda? ${supportEmail}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
