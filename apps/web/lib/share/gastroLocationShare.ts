/**
 * G9.1 / G9.2 — Share a public gastro location.
 * Canonical URL is `/gastronomicos/{profileId}` with no tenant and no portal/admin path.
 */

export function canShareGastroLocation(status: string | null | undefined): boolean {
  return status === 'ACTIVE';
}

export function buildPublicGastroCanonicalPath(profileId: string): string {
  const id = profileId.trim();
  return `/gastronomicos/${encodeURIComponent(id)}`;
}

export function buildPublicGastroCanonicalUrl(origin: string, profileId: string): string {
  const base = origin.trim().replace(/\/+$/, '');
  return `${base}${buildPublicGastroCanonicalPath(profileId)}`;
}

export function buildGastroLocationShareMessage(displayName: string, url: string): string {
  return `Mirá este lugar en Yo Te Invito:\n${displayName.trim()}\n${url}`;
}

/** Share sheet text. Opens WhatsApp with the message; does not target a phone number. */
export function buildWhatsAppShareHref(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/** True when the URL is the public ficha and carries no query (no tenantId, no profile switch). */
export function isPublicGastroShareUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      /^\/gastronomicos\/[^/]+$/.test(parsed.pathname) &&
      parsed.search === '' &&
      parsed.hash === '' &&
      !parsed.pathname.startsWith('/gastro/') &&
      !parsed.pathname.startsWith('/admin/')
    );
  } catch {
    return false;
  }
}
