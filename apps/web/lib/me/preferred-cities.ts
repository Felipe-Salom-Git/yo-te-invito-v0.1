/** Catálogo provincia → ciudades para preferencias y registro. */
export const PROVINCE_CITY_CATALOG = [
  {
    id: 'rio-negro',
    label: 'Río Negro',
    cities: ['Bariloche', 'Dina Huapi', 'El Bolsón'],
  },
  {
    id: 'neuquen',
    label: 'Neuquén',
    cities: ['Villa La Angostura', 'San Martín de los Andes'],
  },
  {
    id: 'otra',
    label: 'Otra ubicación',
    cities: ['Otra'],
    customCity: true,
  },
] as const;

export type ProvinceCatalogEntry = (typeof PROVINCE_CITY_CATALOG)[number];
export type ProvinceId = ProvinceCatalogEntry['id'];

export const OTHER_CITY_LABEL = 'Otra';

export const MAX_PREFERRED_CITIES = 6;

/** Lista plana legacy (compatibilidad con selects simples). */
export const PREFERRED_CITIES = PROVINCE_CITY_CATALOG.flatMap((p) => [...p.cities]);

export type PreferredCity = (typeof PREFERRED_CITIES)[number];

export function provinceOptions() {
  return PROVINCE_CITY_CATALOG.map((p) => ({ value: p.id, label: p.label }));
}

export function citiesForProvince(provinceId: string): string[] {
  const p = PROVINCE_CITY_CATALOG.find((x) => x.id === provinceId);
  return p ? [...p.cities] : [];
}

export function isCustomProvince(provinceId: string): boolean {
  return provinceId === 'otra';
}

export function findProvinceLabelForCity(city: string): string | null {
  const t = city.trim();
  for (const p of PROVINCE_CITY_CATALOG) {
    if ((p.cities as readonly string[]).includes(t)) return p.label;
  }
  return null;
}

export function preferredCityOptions(current?: string | null) {
  const value = current?.trim();
  const base = PREFERRED_CITIES.map((c) => ({ value: c, label: c }));
  if (value && !PREFERRED_CITIES.includes(value as PreferredCity)) {
    return [{ value, label: value }, ...base];
  }
  return base;
}

/** Normaliza ciudad(es) desde preferencias (array nuevo o `preferredCity` legacy). */
export function readPreferredCities(input: {
  preferredCities?: string[] | null;
  preferredCity?: string | null;
}): string[] {
  const fromList: string[] = [];
  if (Array.isArray(input.preferredCities)) {
    for (const c of input.preferredCities) {
      const t = c?.trim();
      if (t && !fromList.includes(t)) {
        fromList.push(t);
        if (fromList.length >= MAX_PREFERRED_CITIES) break;
      }
    }
  }
  if (fromList.length > 0) return fromList;
  const legacy = input.preferredCity?.trim();
  return legacy ? [legacy] : [];
}

export function primaryPreferredCity(cities: string[]): string | null {
  return cities[0]?.trim() || null;
}

/** Incluye la ciudad del perfil al inicio si aún no está en favoritas. */
export function mergeProfileCityIntoFavorites(
  cities: string[],
  profileCity?: string | null,
): string[] {
  const p = profileCity?.trim();
  if (!p) return cities;
  if (cities.includes(p)) return cities;
  return [p, ...cities].slice(0, MAX_PREFERRED_CITIES);
}
