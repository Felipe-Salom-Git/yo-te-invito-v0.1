import type { RegistrationProfileType } from '@yo-te-invito/shared';
import type { PortalNavKey } from '@/lib/navigation/portalNavConfig';

/** Profile type for PORTAL_ACCESS legal requirements per commercial portal. */
export const PORTAL_LEGAL_PROFILE_BY_KEY: Partial<
  Record<PortalNavKey, RegistrationProfileType>
> = {
  producer: 'PRODUCER',
  gastro: 'GASTRO',
  hotel: 'HOTEL',
  referrer: 'REFERRER',
};

export function portalHasLegalProfile(portalKey: PortalNavKey): boolean {
  return portalKey in PORTAL_LEGAL_PROFILE_BY_KEY;
}
