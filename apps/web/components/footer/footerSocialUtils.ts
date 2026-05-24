import type { PublicPlatformConfig } from '@/repositories/interfaces';
import {
  FOOTER_SOCIAL_LINKS,
  type FooterSocialLink,
} from '@/lib/navigation/footerPublicConfig';

export type FooterSocialDisplayItem = FooterSocialLink & {
  /** Resolved href for navigation; null = show as pending, not a link */
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

/**
 * Merges static config with optional API fields (instagramUrl, websiteUrl).
 */
export function resolveFooterSocialLinks(
  apiConfig?: PublicPlatformConfig,
): FooterSocialDisplayItem[] {
  const byId = new Map(FOOTER_SOCIAL_LINKS.map((item) => [item.id, { ...item }]));

  const instagramFromApi = apiConfig?.instagramUrl?.trim();
  if (instagramFromApi && isSafeExternalUrl(instagramFromApi)) {
    byId.set('instagram', {
      id: 'instagram',
      label: 'Instagram',
      href: instagramFromApi,
      placeholder: false,
    });
  }

  const websiteFromApi = apiConfig?.websiteUrl?.trim();
  if (websiteFromApi && isSafeExternalUrl(websiteFromApi)) {
    byId.set('website', {
      id: 'website',
      label: 'Sitio web',
      href: websiteFromApi,
      placeholder: false,
    });
  }

  return Array.from(byId.values()).map((item) => ({
    ...item,
    displayHref:
      item.href && isSafeExternalUrl(item.href) ? item.href : null,
  }));
}
