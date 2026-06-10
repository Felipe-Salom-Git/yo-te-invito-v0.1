/**
 * Role-based portal home — single source for post-login and /profiles redirects (V3.1 Etapa 1).
 */
import { Role, type Role as RoleType } from '@yo-te-invito/shared';
import { isMasterUserEmail, MASTER_USER_PORTAL_HOME_HREF } from './masterUser';

const SCANNER_FALLBACK_HREF = 'https://scanner.yoteinvito.club/door';

/** Default portal path by JWT role (priority when user has a single role). */
export function getDefaultPortalHomeForRole(role: RoleType | string | null | undefined): string {
  switch (role) {
    case Role.ADMIN:
      return '/admin';
    case Role.PRODUCER_OWNER:
    case Role.PRODUCER_STAFF:
      return '/producer';
    case Role.GASTRO_OWNER:
      return '/gastro';
    case Role.HOTEL_OWNER:
      return '/hotel';
    case Role.REFERRER:
      return '/referrer';
    case Role.SCANNER:
      return process.env.NEXT_PUBLIC_SCANNER_APP_URL ?? SCANNER_FALLBACK_HREF;
    case Role.USER:
    default:
      return '/me';
  }
}

/** Portal home for navbar / footer — master user keeps `/me` for multi-portal sidebar. */
export function getPortalHomeHrefForUser(
  email: string | null | undefined,
  role?: RoleType | string | null,
): string {
  if (isMasterUserEmail(email)) return MASTER_USER_PORTAL_HOME_HREF;
  return getDefaultPortalHomeForRole(role);
}

/** Relative callback paths only — blocks open redirects and deprecated `/profiles`. */
export function isSafePostLoginCallbackUrl(callbackUrl: string | null | undefined): boolean {
  if (!callbackUrl?.trim()) return false;
  try {
    const path = decodeURIComponent(callbackUrl.trim());
    if (!path.startsWith('/')) return false;
    if (path.startsWith('//')) return false;
    if (path === '/profiles' || path.startsWith('/profiles/')) return false;
    if (path.startsWith('/login') || path.startsWith('/logout')) return false;
    return true;
  } catch {
    return false;
  }
}

export function resolvePostLoginHref(options: {
  callbackUrl?: string | null;
  email?: string | null;
  role?: RoleType | string | null;
}): string {
  const { callbackUrl, email, role } = options;
  if (isSafePostLoginCallbackUrl(callbackUrl)) {
    return decodeURIComponent(callbackUrl!.trim());
  }
  if (email != null || role != null) {
    return getPortalHomeHrefForUser(email, role);
  }
  /** OAuth / pre-session — `/profiles` is a role router (no selector UI). */
  return '/profiles';
}

/** Label for navbar «portal home» item. */
export function getPortalHomeMenuLabel(
  email: string | null | undefined,
  role?: RoleType | string | null,
): string {
  if (isMasterUserEmail(email)) return 'Inicio del portal';
  if (role === Role.ADMIN) return 'Panel admin';
  switch (role) {
    case Role.PRODUCER_OWNER:
    case Role.PRODUCER_STAFF:
      return 'Panel productora';
    case Role.GASTRO_OWNER:
      return 'Panel gastronómico';
    case Role.HOTEL_OWNER:
      return 'Panel hotel';
    case Role.REFERRER:
      return 'Panel referido';
    case Role.SCANNER:
      return 'Abrir scanner';
    default:
      return 'Mi espacio';
  }
}

/** Whether standard buyer portal `/me` should be the primary UX for this session. */
export function shouldUseStandardUserPortal(
  email: string | null | undefined,
  role?: RoleType | string | null,
): boolean {
  if (isMasterUserEmail(email)) return true;
  if (role === Role.ADMIN) return false;
  if (!role || role === Role.USER) return true;
  return false;
}
