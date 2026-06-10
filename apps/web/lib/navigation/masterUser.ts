import { MASTER_USER_EMAIL } from '@yo-te-invito/shared';
import type { PortalNavKey } from './portalNavConfig';

/** Portal de entrada para el usuario maestro — sidebar multi-vertical en todos los portales. */
export const MASTER_USER_PORTAL_HOME_HREF = '/me';

export function isMasterUserEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === MASTER_USER_EMAIL.toLowerCase();
}

/** Secciones del sidebar maestro — etiqueta corta → ítems de `portalNavConfig`. */
export const MASTER_PORTAL_NAV_SECTIONS: { key: PortalNavKey; label: string }[] = [
  { key: 'me', label: 'Usuario' },
  { key: 'producer', label: 'Productora' },
  { key: 'admin', label: 'Administración' },
  { key: 'gastro', label: 'Gastronómico' },
  { key: 'hotel', label: 'Hotel' },
  { key: 'referrer', label: 'Referido' },
];

/** @deprecated Import from `rolePortalHome.ts` — re-export for backward compatibility. */
export { getPortalHomeHrefForUser } from './rolePortalHome';
