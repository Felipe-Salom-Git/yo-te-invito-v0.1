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
 * Unknown city names (from API, not in catalog) go under «Ciudades».
 */
export function groupCitiesByProvince(cityNames: string[]): NavbarCityGroup[] {
  const unique = [...new Set(cityNames.map((c) => c.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );

  const groups: NavbarCityGroup[] = PROVINCE_CITY_CATALOG.filter((p) => p.id !== 'otra')
    .map((p) => ({
      provinceLabel: p.label,
      cities: unique
        .filter((city) => (p.cities as readonly string[]).includes(city))
        .map((city) => ({ value: city, label: city })),
    }))
    .filter((g) => g.cities.length > 0);

  const catalogCities = new Set<string>(
    PROVINCE_CITY_CATALOG.filter((p) => p.id !== 'otra').flatMap((p) => [...p.cities]),
  );
  const extras = unique.filter((c) => !catalogCities.has(c));
  if (extras.length > 0) {
    groups.push({
      provinceLabel: FALLBACK_GROUP_LABEL,
      cities: extras.map((city) => ({ value: city, label: city })),
    });
  }

  return groups;
}

export function provinceLabelForCity(city: string): string | null {
  return findProvinceLabelForCity(city);
}
