/**
 * Portal sidebar / mobile nav — single source per portal (Slice 7).
 * Routes match existing portal layout.tsx files under app/(portal).
 */

export type PortalNavKey = 'me' | 'producer' | 'admin' | 'gastro' | 'hotel' | 'referrer';

export interface PortalNavItem {
  href: string;
  label: string;
}

export interface PortalNavDefinition {
  title: string;
  items: PortalNavItem[];
}

export const PORTAL_NAV_BY_KEY: Record<PortalNavKey, PortalNavDefinition> = {
  me: {
    title: 'Mi espacio',
    items: [
      { href: '/me', label: 'Inicio' },
      { href: '/me/tickets', label: 'Mis tickets' },
      { href: '/me/cart', label: 'Mi Carro' },
      { href: '/me/preferences', label: 'Preferencias' },
      { href: '/me/activity', label: 'Actividad' },
      { href: '/me/notifications', label: 'Notificaciones' },
      { href: '/me/account', label: 'Mi cuenta' },
    ],
  },
  producer: {
    title: 'Productora',
    items: [
      { href: '/producer', label: 'Dashboard' },
      { href: '/producer/profile', label: 'Perfil' },
      { href: '/producer/events', label: 'Eventos' },
      { href: '/producer/comments', label: 'Comentarios' },
      { href: '/producer/referrals', label: 'Referidos' },
      { href: '/producer/payouts', label: 'Payouts' },
    ],
  },
  admin: {
    title: 'Administración',
    items: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/eventos', label: 'Eventos' },
      { href: '/admin/auditoria', label: 'Auditoría' },
      { href: '/admin/legales', label: 'Legales' },
      { href: '/admin/reviews', label: 'Reputación' },
      { href: '/admin/review-disputes', label: 'Reseñas (disputas)' },
      { href: '/admin/productoras', label: 'Productoras' },
      { href: '/admin/publicaciones-generales', label: 'Publicaciones Generales' },
      { href: '/admin/gastronomicos', label: 'Gastronómicos' },
      { href: '/admin/excursiones', label: 'Excursiones' },
      { href: '/admin/rentals', label: 'Rentals' },
      { href: '/admin/payouts', label: 'Payouts' },
      { href: '/admin/usuarios', label: 'Usuarios' },
      { href: '/admin/tickets', label: 'Tickets' },
      { href: '/admin/contactos', label: 'Contactos' },
      { href: '/admin/categorias', label: 'Subcategorías' },
    ],
  },
  gastro: {
    title: 'Gastronómico',
    items: [
      { href: '/gastro', label: 'Dashboard' },
      { href: '/gastro/local', label: 'Mi local' },
      { href: '/gastro/contenido', label: 'Contenido' },
      { href: '/gastro/descuentos', label: 'Descuentos' },
      { href: '/gastro/validaciones', label: 'Resumen descuentos' },
      { href: '/gastro/valoraciones', label: 'Valoraciones' },
    ],
  },
  hotel: {
    title: 'Hotel',
    items: [
      { href: '/hotel', label: 'Mi establecimiento' },
      { href: '/hotel/editar', label: 'Editar ficha' },
      { href: '/hotel/valoraciones', label: 'Valoraciones' },
    ],
  },
  referrer: {
    title: 'Referido',
    items: [
      { href: '/referrer', label: 'Dashboard' },
      { href: '/referrer/eventos', label: 'Eventos' },
      { href: '/referrer/configuracion', label: 'Configuración' },
    ],
  },
};

const PORTAL_PATH_PREFIXES: { prefix: string; key: PortalNavKey }[] = [
  { prefix: '/me', key: 'me' },
  { prefix: '/producer', key: 'producer' },
  { prefix: '/admin', key: 'admin' },
  { prefix: '/gastro', key: 'gastro' },
  { prefix: '/hotel', key: 'hotel' },
  { prefix: '/referrer', key: 'referrer' },
];

/** Dashboard routes — active only on exact match, not child paths. */
export const PORTAL_INDEX_HREFS = new Set([
  '/me',
  '/admin',
  '/producer',
  '/gastro',
  '/hotel',
  '/referrer',
]);

export function getPortalNavDefinition(key: PortalNavKey): PortalNavDefinition {
  return PORTAL_NAV_BY_KEY[key];
}

export function resolvePortalNavKeyFromPathname(pathname: string): PortalNavKey | null {
  for (const { prefix, key } of PORTAL_PATH_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return key;
    }
  }
  return null;
}

export function isPortalNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (PORTAL_INDEX_HREFS.has(href)) return false;
  return pathname.startsWith(`${href}/`);
}
