/** Safe console output for smoke:getnet-webcheckout (no full redirect URLs or tokens). */

export type SanitizedRedirectLog = {
  redirect_url: string;
  redirect_host?: string;
  redirect_path?: string;
};

export function sanitizeRedirectUrlForLog(url: string | undefined): SanitizedRedirectLog {
  if (!url?.trim()) {
    return { redirect_url: '(not received)' };
  }
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const redirectPath =
      segments.length === 0
        ? '/[masked]'
        : `/${segments[0]}/[masked]`;
    return {
      redirect_url: 'received',
      redirect_host: parsed.hostname,
      redirect_path: redirectPath,
    };
  } catch {
    return { redirect_url: 'received', redirect_path: '/[masked]' };
  }
}

export function logSanitizedRedirectUrl(url: string | undefined): void {
  const info = sanitizeRedirectUrlForLog(url);
  console.log(`redirect_url: ${info.redirect_url}`);
  if (info.redirect_host) console.log(`redirect_host: ${info.redirect_host}`);
  if (info.redirect_path) console.log(`redirect_path: ${info.redirect_path}`);
}

/** Redact JWTs, Bearer tokens, and raw URLs from error/log strings. */
export function sanitizeSmokeLogText(text: string): string {
  return text
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[url-redacted]')
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt-redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/access_token[=:]\S+/gi, 'access_token=[redacted]');
}
