import { escapeHtml } from '../email-template.util';

export type BaseEmailLayoutInput = {
  previewText: string;
  headline?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  supportEmail?: string;
  footerNote?: string;
};

const COLORS = {
  bg: '#0a0a0a',
  panel: '#111827',
  panelInner: '#1f2937',
  accent: '#22c55e',
  text: '#ffffff',
  muted: '#9ca3af',
  border: '#1f2937',
};

export function renderBaseEmailLayout(input: BaseEmailLayoutInput): string {
  const preview = escapeHtml(input.previewText);
  const headline = input.headline ? escapeHtml(input.headline) : '';
  const support = escapeHtml(input.supportEmail ?? 'soporte@yoteinvito.club');
  const footerNote = input.footerNote
    ? escapeHtml(input.footerNote)
    : 'Yo Te Invito — Plataforma de ticketing, experiencias y servicios turísticos.';

  const ctaBlock =
    input.ctaLabel && input.ctaUrl
      ? `<tr>
          <td align="center" style="padding:8px 0 24px;">
            <a href="${escapeHtml(input.ctaUrl)}" target="_blank" rel="noopener noreferrer"
              style="display:inline-block;background:${COLORS.accent};color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;line-height:1.2;text-decoration:none;padding:14px 28px;border-radius:8px;">
              ${escapeHtml(input.ctaLabel)}
            </a>
          </td>
        </tr>`
      : '';

  const headlineRow = headline
    ? `<tr>
          <td style="padding:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;line-height:1.3;color:${COLORS.text};">
            ${headline}
          </td>
        </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>Yo Te Invito</title>
</head>
<body style="margin:0;padding:0;background-color:${COLORS.bg};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;font-size:1px;line-height:1px;">
    ${preview}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${COLORS.bg};margin:0;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:${COLORS.panel};border:1px solid ${COLORS.border};border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;color:${COLORS.accent};">
              Yo Te Invito
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 24px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                ${headlineRow}
                <tr>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLORS.text};">
                    ${input.bodyHtml}
                  </td>
                </tr>
                ${ctaBlock}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 20px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:${COLORS.muted};border-top:1px solid ${COLORS.panelInner};">
              <p style="margin:16px 0 8px;">¿Necesitás ayuda? Escribinos a <a href="mailto:${support}" style="color:${COLORS.accent};text-decoration:none;">${support}</a>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:${COLORS.muted};">
              ${footerNote}<br>
              © ${new Date().getFullYear()} Yo Te Invito.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
