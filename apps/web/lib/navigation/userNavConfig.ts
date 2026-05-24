/**
 * User account dropdown — logged-in menu (Slice 3).
 * Portal access (admin, producer, gastro, etc.) is via /profiles, not duplicated here.
 * Usuario maestro: inicio directo en `/me` (ver `masterUser.ts`).
 */

import { getPortalHomeHrefForUser } from './masterUser';

export interface UserMenuItem {
  id: 'portal-home' | 'tickets' | 'account' | 'logout';
  label: string;
  href: string;
}

/** Profile selector — entry point for all role-specific portals. */
export const USER_MENU_PORTAL_HOME_HREF = '/profiles';

const USER_MENU_LOGGED_IN_BASE: UserMenuItem[] = [
  {
    id: 'portal-home',
    label: 'Inicio del portal',
    href: USER_MENU_PORTAL_HOME_HREF,
  },
  {
    id: 'tickets',
    label: 'Mis tickets',
    href: '/me/tickets',
  },
  {
    id: 'account',
    label: 'Mi cuenta',
    href: '/me/account',
  },
  {
    id: 'logout',
    label: 'Cerrar sesión',
    href: '/logout',
  },
];

/** Menú cuenta con href de inicio según email (maestro → `/me`). */
export function getUserMenuLoggedInItems(userEmail?: string | null): UserMenuItem[] {
  const portalHome = getPortalHomeHrefForUser(userEmail);
  return USER_MENU_LOGGED_IN_BASE.map((item) =>
    item.id === 'portal-home' ? { ...item, href: portalHome } : item,
  );
}

/** @deprecated Usar `getUserMenuLoggedInItems(email)` — mantiene compatibilidad con `/profiles`. */
export const USER_MENU_LOGGED_IN_ITEMS: UserMenuItem[] = USER_MENU_LOGGED_IN_BASE;
