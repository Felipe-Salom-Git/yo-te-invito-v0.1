import type { UserPortalPreferences } from '@yo-te-invito/shared';
import { contentMainCategorySchema } from '@yo-te-invito/shared';

const CATEGORY_LABELS: Record<string, string> = {
  event: 'eventos',
  gastro: 'gastronomía',
  rental: 'alquileres',
  excursion: 'excursiones',
};

export function categoryLabel(category: string | null | undefined): string {
  const c = (category ?? 'event').toLowerCase();
  return CATEGORY_LABELS[c] ?? c;
}

export function isHotelCategory(category: string | null | undefined): boolean {
  return (category ?? '').toLowerCase() === 'hotel';
}

export function normalizeCity(value: string | null | undefined): string | null {
  const t = value?.trim().toLowerCase();
  return t || null;
}

export function cityMatchesPreferences(
  eventCity: string | null | undefined,
  prefs: UserPortalPreferences,
): boolean {
  const cities = prefs.preferredCities
    .map((c) => normalizeCity(c))
    .filter((c): c is string => !!c);
  if (cities.length === 0) return true;
  const city = normalizeCity(eventCity);
  if (!city) return false;
  return cities.some((c) => c === city || city.includes(c) || c.includes(city));
}

export function eventMainCategory(
  category: string | null | undefined,
): UserPortalPreferences['favoriteCategories'][number] | null {
  const c = (category ?? 'event').toLowerCase();
  const parsed = contentMainCategorySchema.safeParse(c);
  return parsed.success ? parsed.data : null;
}

export type InterestMatchReason = 'category' | 'subcategory' | null;

export function interestMatchReason(
  eventCategory: string | null | undefined,
  subcategoryId: string | null | undefined,
  prefs: UserPortalPreferences,
): InterestMatchReason {
  if (subcategoryId && prefs.favoriteSubcategoryIds.includes(subcategoryId)) {
    return 'subcategory';
  }
  const main = eventMainCategory(eventCategory);
  if (main && prefs.favoriteCategories.includes(main)) {
    return 'category';
  }
  return null;
}

export function shouldNotifyInterestMatch(
  eventCategory: string | null | undefined,
  subcategoryId: string | null | undefined,
  prefs: UserPortalPreferences,
): boolean {
  if (isHotelCategory(eventCategory)) return false;
  const reason = interestMatchReason(eventCategory, subcategoryId, prefs);
  if (!reason) return false;
  if (reason === 'subcategory') {
    return prefs.notifyFavoriteSubcategories || prefs.notifyRecommendations;
  }
  return prefs.notifyFavoriteCategories || prefs.notifyRecommendations;
}
