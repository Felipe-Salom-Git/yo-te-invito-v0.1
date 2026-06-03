import { escapeHtml } from './email-template.util';

export function optionalEventDetailsHtml(variables: Record<string, unknown>): string {
  const eventDate = variables.eventDate as string | undefined;
  const eventTime = variables.eventTime as string | undefined;
  const venueName = variables.venueName as string | undefined;
  const city = variables.city as string | undefined;

  const rows: string[] = [];
  if (eventDate) rows.push(`<li>Fecha: ${escapeHtml(eventDate)}</li>`);
  if (eventTime) rows.push(`<li>Hora: ${escapeHtml(eventTime)}</li>`);
  if (venueName) rows.push(`<li>Lugar: ${escapeHtml(venueName)}</li>`);
  if (city) rows.push(`<li>Ciudad: ${escapeHtml(city)}</li>`);

  if (rows.length === 0) return '';
  return `<p style="margin:16px 0 8px;font-weight:bold;">Detalles</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#e5e7eb;">${rows.join('')}</ul>`;
}
