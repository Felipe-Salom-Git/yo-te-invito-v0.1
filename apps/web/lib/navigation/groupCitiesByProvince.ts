import {
  cityDisplayLabel,
  normalizeCityKey,
  resolveCanonicalCityValue,
} from '@yo-te-invito/shared';
import {
  findProvinceLabelForCity,
  PROVINCE_CITY_CATALOG,
} from '@/lib/me/preferred-cities';

export interface NavbarCityGroup {
  provinceLabel: string;
  cities: { value: string; label: string }[];
}

const FALLBACK_GROUP_LABEL = 'Ciudades';

/**
 * Groups discovery cities under province labels from `PROVINCE_CITY_CATALOG`.
 * Normalizes duplicates (slug vs label) and shows readable labels.
 */
export function groupCitiesByProvince(cityNames: string[]): NavbarCityGroup[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const raw of cityNames) {
    const canonical = resolveCanonicalCityValue(raw);
    const key = normalizeCityKey(canonical);
    if (!canonical || seen.has(key)) continue;
    seen.add(key);
    unique.push(canonical);
  }
  unique.sort((a, b) => cityDisplayLabel(a).localeCompare(cityDisplayLabel(b), 'es'));

  const groups: NavbarCityGroup[] = PROVINCE_CITY_CATALOG.filter((p) => p.id !== 'otra')
    .map((p) => ({
      provinceLabel: p.label,
      cities: unique
        .filter((city) => (p.cities as readonly string[]).includes(city))
        .map((city) => ({ value: city, label: cityDisplayLabel(city) })),
    }))
    .filter((g) => g.cities.length > 0);

  const catalogCities = new Set<string>(
    PROVINCE_CITY_CATALOG.filter((p) => p.id !== 'otra').flatMap((p) => [...p.cities]),
  );
  const extras = unique.filter((c) => !catalogCities.has(c));
  if (extras.length > 0) {
    groups.push({
      provinceLabel: FALLBACK_GROUP_LABEL,
      cities: extras.map((city) => ({ value: city, label: cityDisplayLabel(city) })),
    });
  }

  return groups;
}

export function provinceLabelForCity(city: string): string | null {
  return findProvinceLabelForCity(city);
}
