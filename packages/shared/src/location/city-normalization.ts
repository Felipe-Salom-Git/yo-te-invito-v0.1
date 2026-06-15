import { ARGENTINA_PROVINCES } from './argentina-locations';
import { cityLabelFromValue } from './labels';

/** Normalize city string for comparison (slug-like key). */
export function normalizeCityKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

/** Resolve API/legacy city variants to canonical catalog `value` when possible. */
export function resolveCanonicalCityValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const key = normalizeCityKey(trimmed);
  for (const province of ARGENTINA_PROVINCES) {
    for (const city of province.cities) {
      if (
        city.value === trimmed ||
        normalizeCityKey(city.value) === key ||
        normalizeCityKey(city.label) === key
      ) {
        return city.value;
      }
    }
  }
  return trimmed;
}

/** Human-readable city label for UI and public API responses. */
export function cityDisplayLabel(value: string): string {
  if (!value.trim()) return '';
  const canonical = resolveCanonicalCityValue(value);
  const fromCatalog = cityLabelFromValue(canonical);
  if (fromCatalog && fromCatalog !== canonical) return fromCatalog;
  if (fromCatalog) return fromCatalog;
  return canonical
    .split('-')
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(' ');
}

/** Query-safe city value (catalog slug when known). */
export function cityQueryValue(value: string): string {
  return resolveCanonicalCityValue(value);
}
