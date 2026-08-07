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
import {
  canAccessPublicCategory,
  isCategoryComingSoon,
} from '@/lib/categories/categoryAvailability';

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

function buildCategoryNavItems(role?: string | null): PublicNavItem[] {
  return CATEGORY_NAV.map(({ id, category, label }) => {
    const locked = isCategoryComingSoon(category) && !canAccessPublicCategory(category, role);
    return {
      id,
      label,
      href: getCategoryGatewayHref(category),
      desktop: false,
      mobileMenu: true,
      ...(locked
        ? {
            comingSoon: true,
            disabled: true,
            ariaLabel: `${label} — próximamente`,
          }
        : {
            ariaLabel: label,
          }),
    };
  });
}

function buildPublicNavItems(role?: string | null): PublicNavItem[] {
  return [
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
    ...buildCategoryNavItems(role),
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
}

/** Anonymous / default catalog (locked coming-soon categories). Prefer role-aware getters. */
export const PUBLIC_NAV_ITEMS: PublicNavItem[] = buildPublicNavItems(null);

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

export function getDesktopPublicNavItems(role?: string | null): PublicNavItem[] {
  return buildPublicNavItems(role).filter((item) => item.desktop && !item.disabled);
}

export function getMobileMenuPublicNavItems(role?: string | null): PublicNavItem[] {
  return getMobilePublicNavDrawerItems(role);
}

export function getMobilePublicNavDrawerItems(role?: string | null): PublicNavItem[] {
  const byId = new Map(buildPublicNavItems(role).map((item) => [item.id, item]));
  return MOBILE_DRAWER_PUBLIC_ORDER.map((id) => byId.get(id)).filter(
    (item): item is PublicNavItem => !!item,
  );
}
