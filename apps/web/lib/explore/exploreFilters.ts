/**
 * Explore page filter state + URL query params (shareable / refresh-safe).
 */

export const EXPLORE_MAIN_CATEGORIES = ['event', 'gastro', 'rental', 'excursion'] as const;

export type ExploreMainCategory = (typeof EXPLORE_MAIN_CATEGORIES)[number];

export const EXPLORE_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas las categorías' },
  { value: 'event', label: 'Eventos' },
  { value: 'gastro', label: 'Gastronomía' },
  { value: 'rental', label: 'Equipos y Rentals' },
  { value: 'excursion', label: 'Excursiones' },
];

export interface ExploreFiltersState {
  q: string;
  city: string;
  dateFrom: string;
  dateTo: string;
  category: string;
  subcategoryId: string;
  /** Slug from URL (`?subcategory=`); resolved to id when subcategories load */
  subcategorySlug: string;
  page: number;
}

export const EXPLORE_DEFAULT_FILTERS: ExploreFiltersState = {
  q: '',
  city: '',
  dateFrom: '',
  dateTo: '',
  category: '',
  subcategoryId: '',
  subcategorySlug: '',
  page: 1,
};

export function isExploreMainCategory(value: string): value is ExploreMainCategory {
  return (EXPLORE_MAIN_CATEGORIES as readonly string[]).includes(value);
}

export function parseExploreSearchParams(params: URLSearchParams): ExploreFiltersState {
  const pageRaw = parseInt(params.get('page') ?? '1', 10);
  return {
    q: params.get('q') ?? '',
    city: params.get('city') ?? '',
    dateFrom: params.get('from') ?? params.get('dateFrom') ?? '',
    dateTo: params.get('to') ?? params.get('dateTo') ?? '',
    category: params.get('category') ?? '',
    subcategoryId: params.get('subcategoryId') ?? '',
    subcategorySlug:
      params.get('subcategory') ?? params.get('subcategorySlug') ?? '',
    page: Number.isFinite(pageRaw) && pageRaw >= 1 ? pageRaw : 1,
  };
}

export function buildExploreSearchParams(filters: ExploreFiltersState): URLSearchParams {
  const qs = new URLSearchParams();
  const q = filters.q.trim();
  const city = filters.city.trim();
  if (q) qs.set('q', q);
  if (city) qs.set('city', city);
  if (filters.dateFrom.trim()) qs.set('from', filters.dateFrom.trim());
  if (filters.dateTo.trim()) qs.set('to', filters.dateTo.trim());
  if (filters.category.trim()) qs.set('category', filters.category.trim());
  if (filters.subcategoryId.trim() && isExploreMainCategory(filters.category)) {
    qs.set('subcategoryId', filters.subcategoryId.trim());
  } else if (
    filters.subcategorySlug.trim() &&
    isExploreMainCategory(filters.category)
  ) {
    qs.set('subcategory', filters.subcategorySlug.trim());
  }
  if (filters.page > 1) qs.set('page', String(filters.page));
  return qs;
}

export function hasActiveExploreFilters(filters: ExploreFiltersState): boolean {
  return (
    !!filters.q.trim() ||
    !!filters.city.trim() ||
    !!filters.dateFrom.trim() ||
    !!filters.dateTo.trim() ||
    !!filters.category.trim() ||
    !!filters.subcategoryId.trim()
  );
}

/** HTML date (YYYY-MM-DD) → ISO datetime for API Zod validation */
export function exploreDateToApiIso(date: string, endOfDay = false): string | undefined {
  const d = date.trim();
  if (!d) return undefined;
  if (d.includes('T')) return d;
  return endOfDay ? `${d}T23:59:59.999Z` : `${d}T00:00:00.000Z`;
}
