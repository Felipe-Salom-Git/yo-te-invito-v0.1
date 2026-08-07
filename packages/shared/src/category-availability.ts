/**
 * Public discovery availability for main categories (V3.2 Slice 10 + owner preview hotfix).
 * Flip `mode` to `public` to reopen Eventos / Gastronomía for everyone.
 */

import { Role } from './enums/role';

export type CategoryAvailabilityMode = 'public' | 'comingSoon';

export const CATEGORY_PUBLIC_AVAILABILITY: Record<string, CategoryAvailabilityMode> = {
  event: 'comingSoon',
  gastro: 'comingSoon',
  rental: 'public',
  excursion: 'public',
  hotel: 'comingSoon',
};

/**
 * Roles allowed to preview a coming-soon category in public discovery.
 * Portals `/producer/*` `/gastro/*` `/admin/*` are unaffected.
 *
 * - event: ADMIN + productora (`PRODUCER_OWNER`, `PRODUCER_STAFF`)
 * - gastro: ADMIN + gastronómico (`GASTRO_OWNER`)
 * - hotel: ADMIN only (vertical still Próximamente for owners)
 */
export const CATEGORY_PREVIEW_ROLES: Record<string, readonly Role[]> = {
  event: [Role.ADMIN, Role.PRODUCER_OWNER, Role.PRODUCER_STAFF],
  gastro: [Role.ADMIN, Role.GASTRO_OWNER],
  hotel: [Role.ADMIN],
};

export const COMING_SOON_PUBLIC_CATEGORIES = (
  Object.entries(CATEGORY_PUBLIC_AVAILABILITY)
    .filter(([, mode]) => mode === 'comingSoon')
    .map(([category]) => category)
) as string[];

export function getCategoryAvailability(category: string | null | undefined): CategoryAvailabilityMode {
  if (!category) return 'public';
  return CATEGORY_PUBLIC_AVAILABILITY[category] ?? 'public';
}

export function getCategoryPreviewRoles(category: string | null | undefined): readonly Role[] {
  if (!category) return [];
  return CATEGORY_PREVIEW_ROLES[category] ?? [];
}

export function isCategoryPubliclyAvailable(category: string | null | undefined): boolean {
  return getCategoryAvailability(category) === 'public';
}

export function isCategoryComingSoon(category: string | null | undefined): boolean {
  return getCategoryAvailability(category) === 'comingSoon';
}

/** True if role may preview this category while it is comingSoon. */
export function canPreviewComingSoonCategory(
  category: string | null | undefined,
  role?: string | null,
): boolean {
  if (!role || !category || !isCategoryComingSoon(category)) return false;
  return getCategoryPreviewRoles(category).includes(role as Role);
}

/**
 * @deprecated Prefer `canAccessPublicCategory(category, role)`.
 * Kept for ADMIN-only global checks; does not grant producer/gastro preview.
 */
export function canAccessComingSoonCategory(role?: string | null): boolean {
  return role === Role.ADMIN;
}

export function canAccessPublicCategory(
  category: string | null | undefined,
  role?: string | null,
): boolean {
  if (isCategoryPubliclyAvailable(category)) return true;
  if (!isCategoryComingSoon(category)) return true;
  return canPreviewComingSoonCategory(category, role);
}

/** Coming-soon categories the role must not see in public list/detail/search. */
export function getDeniedComingSoonCategories(role?: string | null): string[] {
  return COMING_SOON_PUBLIC_CATEGORIES.filter(
    (category) => !canAccessPublicCategory(category, role),
  );
}
