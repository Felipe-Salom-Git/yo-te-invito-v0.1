import type { RenderedEmailTemplate } from '../email-template.types';
import { adminEmailFooterYear, adminPanelUrl } from '../admin-operational-email.util';
import {
  escapeHtml,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAdminExpiredBenefitsDigest(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const digestDate = getString(variables, 'digestDate');
  const gastroCount = getString(variables, 'gastroCount', '0');
  const couponCount = getString(variables, 'couponCount', '0');
  const gastroLines = getString(variables, 'gastroLines');
  const couponLines = getString(variables, 'couponLines');
  const gastroExtra = getString(variables, 'gastroExtraCount', '0');
  const couponExtra = getString(variables, 'couponExtraCount', '0');
  const adminUrl = getString(variables, 'adminUrl', adminPanelUrl());
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `[Yo Te Invito] Beneficios vencidos (${digestDate})`;
  const previewText = `${gastroCount} descuentos Gastro y ${couponCount} cupones de actividad vencidos`;

  const gastroBlock = gastroLines
    ? `<p style="margin:12px 0 4px;"><strong>Descuentos Gastro</strong></p>
       <p style="margin:0;white-space:pre-wrap;">${escapeHtml(gastroLines)}</p>
       ${Number(gastroExtra) > 0 ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">+${escapeHtml(gastroExtra)} más</p>` : ''}`
    : '';
  const couponBlock = couponLines
    ? `<p style="margin:12px 0 4px;"><strong>Cupones de actividad</strong></p>
       <p style="margin:0;white-space:pre-wrap;">${escapeHtml(couponLines)}</p>
       ${Number(couponExtra) > 0 ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">+${escapeHtml(couponExtra)} más</p>` : ''}`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Resumen operativo de beneficios que pasaron a vencidos en las últimas 24 horas. No es una campaña comercial.</p>
    <p style="margin:0 0 12px;">Gastro: <strong>${escapeHtml(gastroCount)}</strong> · Actividades: <strong>${escapeHtml(couponCount)}</strong></p>
    ${gastroBlock}
    ${couponBlock}
  `;

  const html = renderBaseEmailLayout({
    previewText,
    headline: 'Beneficios vencidos',
    bodyHtml,
    ctaLabel: 'Abrir admin',
    ctaUrl: adminUrl,
    supportEmail,
    footerNote: `Alerta operativa interna. No usar para promoción. © ${adminEmailFooterYear()}.`,
  });

  const text = [
    `Beneficios vencidos (${digestDate})`,
    `Gastro: ${gastroCount}`,
    gastroLines,
    `Cupones actividad: ${couponCount}`,
    couponLines,
    adminUrl,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
