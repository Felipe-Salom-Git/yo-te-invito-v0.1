/**
 * Navbar city selector — routing helpers (Slice 5).
 *
 * City list availability: `useNavbarDiscoveryCities` (events.search meta.total per catalog city).
 * Province groups: `PROVINCE_CITY_CATALOG` in `lib/me/preferred-cities.ts` (product catalog, not API).
 */

import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { isExploreMainCategory } from '@/lib/explore/exploreFilters';
import {
  buildExploreSearchParams,
  parseExploreSearchParams,
  type ExploreFiltersState,
} from '@/lib/explore/exploreFilters';
import {
  getCategoryExploreHref,
  isCategoryLandingId,
} from '@/lib/categories/categoryLandingConfig';

export const NAVBAR_CITY_ALL_VALUE = '';

export type NavbarCityRouteKind = 'explore' | 'category' | 'home' | 'other';

export interface NavbarCityRouteContext {
  kind: NavbarCityRouteKind;
  /** Explore main category when on /explore or /categoria/[category]. */
  category: string;
  categoryLandingId: CategoryGatewayId | null;
}

export function resolveNavbarCityRoute(pathname: string): NavbarCityRouteContext {
  if (pathname.startsWith('/explore')) {
    return { kind: 'explore', category: '', categoryLandingId: null };
  }
  const segment = pathname.match(/^\/categoria\/([^/]+)/)?.[1];
  if (segment && isCategoryLandingId(segment)) {
    return { kind: 'category', category: segment, categoryLandingId: segment };
  }
  if (pathname === '/home' || pathname === '/') {
    return { kind: 'home', category: '', categoryLandingId: null };
  }
  return { kind: 'other', category: '', categoryLandingId: null };
}

export function readCityFromSearchParams(
  kind: NavbarCityRouteKind,
  params: URLSearchParams,
): string {
  if (kind === 'explore') {
    return params.get('city')?.trim() ?? '';
  }
  return '';
}

export function buildExploreUrlFromFilters(filters: ExploreFiltersState): string {
  const qs = buildExploreSearchParams(filters);
  return qs.toString() ? `/explore?${qs.toString()}` : '/explore';
}

/** Navigate target when user picks a city outside /explore. */
export function buildNavbarCityNavigationHref(
  ctx: NavbarCityRouteContext,
  city: string,
  exploreParams?: URLSearchParams,
): string {
  const trimmed = city.trim();
  if (ctx.kind === 'explore' && exploreParams) {
    const filters = parseExploreSearchParams(exploreParams);
    return buildExploreUrlFromFilters({
      ...filters,
      city: trimmed,
      page: 1,
    });
  }
  if (ctx.kind === 'category' && ctx.categoryLandingId) {
    return getCategoryExploreHref(ctx.categoryLandingId, { city: trimmed || undefined });
  }
  if (trimmed) {
    const qs = new URLSearchParams();
    qs.set('city', trimmed);
    if (ctx.category && isExploreMainCategory(ctx.category)) {
      qs.set('category', ctx.category);
    }
    return `/explore?${qs.toString()}`;
  }
  if (ctx.category && isExploreMainCategory(ctx.category)) {
    return `/explore?category=${ctx.category}`;
  }
  return '/explore';
}
