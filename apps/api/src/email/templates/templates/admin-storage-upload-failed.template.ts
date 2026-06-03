import type { RenderedEmailTemplate } from '../email-template.types';
import { adminEmailFooterYear } from '../admin-operational-email.util';
import {
  escapeHtml,
  getDefaultSupportEmail,
  getString,
} from '../email-template.util';
import { renderBaseEmailLayout } from '../layouts/base-email-layout';

export function renderAdminStorageUploadFailed(
  variables: Record<string, unknown>,
): RenderedEmailTemplate {
  const entityType = getString(variables, 'entityType', 'entidad');
  const entityId = getString(variables, 'entityId');
  const uploaderEmail = getString(variables, 'uploaderEmail');
  const fileName = getString(variables, 'fileName');
  const errorMessage = getString(variables, 'errorMessage', 'Fallo al subir archivo a storage.');
  const occurredAt = getString(variables, 'occurredAt', new Date().toISOString());
  const context = getString(variables, 'context');
  const adminUrl = getString(variables, 'adminUrl');
  const supportEmail = getString(variables, 'supportEmail', getDefaultSupportEmail());

  const subject = `Error de storage/upload — ${entityType}`;
  const previewText = 'Se detectó un fallo operativo al subir o procesar un archivo.';

  const contextBlock = context
    ? `<p style="margin:16px 0 0;padding:12px;background:#1f2937;border-radius:8px;font-size:13px;line-height:1.5;color:#e5e7eb;white-space:pre-wrap;">${escapeHtml(context)}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 12px;">Se detectó un error operativo de storage en Yo Te Invito.</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">
      <li>Entidad: ${escapeHtml(entityType)}${entityId ? ` (${escapeHtml(entityId)})` : ''}</li>
      ${uploaderEmail ? `<li>Usuario: ${escapeHtml(uploaderEmail)}</li>` : ''}
      ${fileName ? `<li>Archivo: ${escapeHtml(fileName)}</li>` : ''}
      <li>Fecha/hora: ${escapeHtml(occurredAt)}</li>
    </ul>
    <p style="margin:0 0 12px;">${escapeHtml(errorMessage)}</p>
    ${contextBlock}
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">No incluir credenciales ni claves de storage en respuestas.</p>
  `;

  const html = renderBaseEmailLayout({
    previewText,
    headline: 'Storage / upload',
    bodyHtml,
    ctaLabel: 'Ver operación',
    ctaUrl: adminUrl,
    supportEmail,
    footerNote: `Alerta interna Yo Te Invito. © ${adminEmailFooterYear()}.`,
  });

  const text = [
    `Error storage: ${entityType}`,
    entityId ? `ID: ${entityId}` : '',
    uploaderEmail ? `Usuario: ${uploaderEmail}` : '',
    fileName ? `Archivo: ${fileName}` : '',
    '',
    errorMessage,
    occurredAt ? `Fecha: ${occurredAt}` : '',
    context ? `Contexto:\n${context}` : '',
    '',
    `Admin: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return { subject, previewText, html, text };
}
