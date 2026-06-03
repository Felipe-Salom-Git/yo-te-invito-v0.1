/** Escape text for safe insertion in HTML email bodies. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getString(
  variables: Record<string, unknown>,
  key: string,
  fallback = '',
): string {
  const raw = variables[key];
  if (raw == null) return fallback;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    return trimmed || fallback;
  }
  if (typeof raw === 'number' || typeof raw === 'boolean') {
    return String(raw);
  }
  return fallback;
}

export function getAppUrl(): string {
  return (
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

export function getDefaultSupportEmail(): string {
  return process.env.MAIL_REPLY_TO?.trim() || 'soporte@yoteinvito.club';
}

export function getCurrentYear(): string {
  return String(new Date().getFullYear());
}
