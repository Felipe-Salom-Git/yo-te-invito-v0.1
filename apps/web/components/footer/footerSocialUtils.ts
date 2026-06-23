import type { PublicPlatformConfig } from '@/repositories/interfaces';
import {
  FOOTER_SOCIAL_LINKS,
  type FooterSocialLink,
} from '@/lib/navigation/footerPublicConfig';

export type FooterSocialDisplayItem = FooterSocialLink & {
  /** Resolved href for navigation; null = omit from footer */
  displayHref: string | null;
};

function isSafeExternalUrl(href: string): boolean {
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function resolveInstagramHref(apiConfig?: PublicPlatformConfig): string | null {
  const instagramFromApi = apiConfig?.instagramUrl?.trim();
  const instagramHref =
    instagramFromApi && isSafeExternalUrl(instagramFromApi)
      ? instagramFromApi
      : FOOTER_SOCIAL_LINKS.find((item) => item.id === 'instagram')?.href ?? null;

  if (!instagramHref || !isSafeExternalUrl(instagramHref)) {
    return null;
  }

  return instagramHref;
}

/** Resolved Instagram URL for footer highlight (API override + static fallback). */
export function resolveFooterInstagramUrl(
  apiConfig?: PublicPlatformConfig,
): string | null {
  return resolveInstagramHref(apiConfig);
}

/**
 * Merges static config with optional API field (instagramUrl).
 */
export function resolveFooterSocialLinks(
  apiConfig?: PublicPlatformConfig,
): FooterSocialDisplayItem[] {
  const instagramHref = resolveInstagramHref(apiConfig);

  if (!instagramHref) {
    return [];
  }

  return [
    {
      id: 'instagram',
      label: 'Instagram',
      href: instagramHref,
      placeholder: false,
      displayHref: instagramHref,
    },
  ];
}
