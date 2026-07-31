/**
 * Public discovery availability for main categories (V3.2 Slice 10).
 * Flip to `public` to reopen Eventos / Gastronomía for everyone.
 */

export type CategoryAvailabilityMode = 'public' | 'comingSoon';

export const CATEGORY_PUBLIC_AVAILABILITY: Record<string, CategoryAvailabilityMode> = {
  event: 'comingSoon',
  gastro: 'comingSoon',
  rental: 'public',
  excursion: 'public',
  hotel: 'comingSoon',
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

export function isCategoryPubliclyAvailable(category: string | null | undefined): boolean {
  return getCategoryAvailability(category) === 'public';
}

export function isCategoryComingSoon(category: string | null | undefined): boolean {
  return getCategoryAvailability(category) === 'comingSoon';
}

/** ADMIN may open coming-soon verticals for commercial demos. */
export function canAccessComingSoonCategory(role?: string | null): boolean {
  return role === 'ADMIN';
}

export function canAccessPublicCategory(
  category: string | null | undefined,
  role?: string | null,
): boolean {
  if (isCategoryPubliclyAvailable(category)) return true;
  if (!isCategoryComingSoon(category)) return true;
  return canAccessComingSoonCategory(role);
}
