/**
 * User account dropdown — logged-in menu (Slice 3 + V3.1 Etapa 1 role scoping).
 */
import { Role, type Role as RoleType } from '@yo-te-invito/shared';
import {
  getPortalHomeHrefForUser,
  getPortalHomeMenuLabel,
  shouldUseStandardUserPortal,
} from './rolePortalHome';

export interface UserMenuItem {
  id: 'portal-home' | 'tickets' | 'account' | 'logout';
  label: string;
  href: string;
}

const USER_MENU_STANDARD: UserMenuItem[] = [
  { id: 'portal-home', label: 'Mi espacio', href: '/me' },
  { id: 'tickets', label: 'Mis tickets', href: '/me/tickets' },
  { id: 'account', label: 'Mi cuenta', href: '/me/account' },
  { id: 'logout', label: 'Cerrar sesión', href: '/logout' },
];

const USER_MENU_ADMIN_ONLY: UserMenuItem[] = [
  { id: 'portal-home', label: 'Panel admin', href: '/admin' },
  { id: 'logout', label: 'Cerrar sesión', href: '/logout' },
];

const USER_MENU_COMMERCIAL: UserMenuItem[] = [
  { id: 'portal-home', label: 'Mi panel', href: '/me' },
  { id: 'account', label: 'Mi cuenta', href: '/me/account' },
  { id: 'logout', label: 'Cerrar sesión', href: '/logout' },
];

/** @deprecated Use `getUserMenuLoggedInItems(email, role)` — legacy default was `/profiles`. */
export const USER_MENU_PORTAL_HOME_HREF = '/me';

/** Menú cuenta según rol — sin paso por `/profiles`. */
export function getUserMenuLoggedInItems(
  userEmail?: string | null,
  role?: RoleType | string | null,
): UserMenuItem[] {
  const portalHome = getPortalHomeHrefForUser(userEmail, role);
  const portalLabel = getPortalHomeMenuLabel(userEmail, role);

  if (role === Role.ADMIN && shouldUseStandardUserPortal(userEmail, role) === false) {
    return USER_MENU_ADMIN_ONLY.map((item) =>
      item.id === 'portal-home' ? { ...item, href: portalHome, label: portalLabel } : item,
    );
  }

  if (shouldUseStandardUserPortal(userEmail, role)) {
    return USER_MENU_STANDARD.map((item) =>
      item.id === 'portal-home' ? { ...item, href: portalHome, label: portalLabel } : item,
    );
  }

  return USER_MENU_COMMERCIAL.map((item) =>
    item.id === 'portal-home' ? { ...item, href: portalHome, label: portalLabel } : item,
  );
}

/** @deprecated Usar `getUserMenuLoggedInItems(email, role)`. */
export const USER_MENU_LOGGED_IN_ITEMS: UserMenuItem[] = USER_MENU_STANDARD;
