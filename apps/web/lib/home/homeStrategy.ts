/**
 * Home strategy resolver — pure, no React.
 * Decides discovery vs personalized path for Home V4.
 */

export type HomeStrategy = 'discovery' | 'personalized';

/** Minimal preferences shape — compatible with UserPreferences from repo. */
export interface HomeStrategyPreferences {
  preferredCity?: string | null;
  /** Future: favorite category ids for rail ordering (e.g. ['gastro','excursion']) */
  preferredCategories?: string[] | null;
  favoriteEventIds?: string[] | null;
}

export interface HomeStrategyInput {
  isAuthenticated: boolean;
  preferences: HomeStrategyPreferences | null;
}

/**
 * Whether preferences contain usable data for personalization.
 * Uses preferredCity; preferredCategories extends personalization when available.
 */
export function hasUsablePreferences(
  preferences: HomeStrategyPreferences | null
): boolean {
  if (!preferences || typeof preferences !== 'object') return false;
  const city = preferences.preferredCity;
  const hasCity = typeof city === 'string' && city.trim().length > 0;
  const cats = preferences.preferredCategories;
  const hasCategories = Array.isArray(cats) && cats.length > 0;
  const favs = preferences.favoriteEventIds;
  const hasFavorites = Array.isArray(favs) && favs.length > 0;
  return hasCity || hasCategories || hasFavorites;
}

/**
 * Resolves the home strategy for the current session.
 * - Not authenticated => discovery
 * - Authenticated but no usable preferences => discovery
 * - Authenticated with usable preferences => personalized
 */
export function resolveHomeStrategy(input: HomeStrategyInput): HomeStrategy {
  if (!input.isAuthenticated) return 'discovery';
  if (!hasUsablePreferences(input.preferences)) return 'discovery';
  return 'personalized';
}
