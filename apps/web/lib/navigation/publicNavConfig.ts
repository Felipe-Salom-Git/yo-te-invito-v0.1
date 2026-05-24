/**
 * Public navbar navigation — desktop bar + mobile drawer (Slice 6).
 *
 * Home entry: `/home` — operational discovery (rails). Logo stays on `/categorias` (category gateway re-entry).
 */

import {
  CATEGORY_GATEWAY_PATH,
  getCategoryGatewayHref,
  type CategoryGatewayId,
} from '@/lib/home/categoryGatewayConfig';

export type PublicNavItemId =
  | 'home-entry'
  | 'explore'
  | 'categories-gateway'
  | 'category-event'
  | 'category-gastro'
  | 'category-rental'
  | 'category-excursion'
  | 'hotels'
  | 'referrers';

/** Where the item may appear (mobile drawer not built until Slice 6). */
export type PublicNavSurface = 'desktop' | 'mobile-menu';

export interface PublicNavItem {
  id: PublicNavItemId;
  label: string;
  href: string;
  ariaLabel?: string;
  /** Primary CTA style (e.g. Explorar). */
  emphasized?: boolean;
  /** Shown on desktop bar (md+). */
  desktop: boolean;
  /** Reserved for Slice 6 mobile drawer. */
  mobileMenu: boolean;
  /** Non-navigable; render as muted label. */
  comingSoon?: boolean;
  disabled?: boolean;
}

/** Logo target — editorial category picker (navbar brand). */
export const PUBLIC_NAV_LOGO_HREF = CATEGORY_GATEWAY_PATH;

/**
 * Compact home / casita — public home with carousels (replaces old "Eventos" text button).
 */
export const PUBLIC_NAV_HOME_ENTRY: Pick<PublicNavItem, 'href' | 'ariaLabel' | 'label'> = {
  label: 'Inicio',
  href: '/home',
  ariaLabel: 'Inicio — descubrir eventos y contenido',
};

const CATEGORY_NAV: { id: PublicNavItemId; category: CategoryGatewayId; label: string }[] = [
  { id: 'category-event', category: 'event', label: 'Eventos' },
  { id: 'category-gastro', category: 'gastro', label: 'Gastronomía' },
  { id: 'category-rental', category: 'rental', label: 'Equipos y rentals' },
  { id: 'category-excursion', category: 'excursion', label: 'Excursiones' },
];

export const PUBLIC_NAV_ITEMS: PublicNavItem[] = [
  {
    id: 'explore',
    label: 'Explorar',
    href: '/explore',
    ariaLabel: 'Explorar eventos y experiencias',
    emphasized: true,
    desktop: true,
    mobileMenu: true,
  },
  {
    id: 'categories-gateway',
    label: 'Inicio / Categorías',
    href: CATEGORY_GATEWAY_PATH,
    ariaLabel: 'Elegir categoría',
    desktop: false,
    mobileMenu: true,
  },
  ...CATEGORY_NAV.map(({ id, category, label }) => ({
    id,
    label,
    href: getCategoryGatewayHref(category),
    desktop: false,
    mobileMenu: true,
  })),
  {
    id: 'hotels',
    label: 'Hoteles',
    href: '/hoteles',
    ariaLabel: 'Hoteles — próximamente',
    comingSoon: true,
    disabled: true,
    desktop: false,
    mobileMenu: true,
  },
  {
    id: 'referrers',
    label: 'Referidores',
    href: '/referrers',
    desktop: false,
    mobileMenu: false,
  },
];

/** Display order for the mobile public drawer (Slice 6). */
const MOBILE_DRAWER_PUBLIC_ORDER: PublicNavItemId[] = [
  'categories-gateway',
  'explore',
  'category-event',
  'category-gastro',
  'category-rental',
  'category-excursion',
  'hotels',
];

export function getDesktopPublicNavItems(): PublicNavItem[] {
  return PUBLIC_NAV_ITEMS.filter((item) => item.desktop && !item.disabled);
}

export function getMobileMenuPublicNavItems(): PublicNavItem[] {
  return getMobilePublicNavDrawerItems();
}

export function getMobilePublicNavDrawerItems(): PublicNavItem[] {
  const byId = new Map(PUBLIC_NAV_ITEMS.map((item) => [item.id, item]));
  return MOBILE_DRAWER_PUBLIC_ORDER.map((id) => byId.get(id)).filter(
    (item): item is PublicNavItem => !!item,
  );
}
