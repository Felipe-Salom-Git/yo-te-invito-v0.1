import type { Prisma } from '@prisma/client';
import { normalizeCityKey, resolveCanonicalCityValue } from '@yo-te-invito/shared';

/** Build OR variants so legacy slug/spaced/cased city values still match. */
export function buildCityMatchVariants(city: string): string[] {
  const trimmed = city.trim();
  if (!trimmed) return [];
  const canonical = resolveCanonicalCityValue(trimmed);
  const key = normalizeCityKey(canonical || trimmed);
  const spaced = key.replace(/-/g, ' ');
  const variants = new Set<string>();
  for (const v of [trimmed, canonical, key, spaced]) {
    if (v?.trim()) variants.add(v.trim());
  }
  return [...variants];
}

export function cityWhereInput(city: string): Prisma.EventWhereInput {
  const variants = buildCityMatchVariants(city);
  if (variants.length === 0) return {};
  if (variants.length === 1) {
    return { city: { equals: variants[0], mode: 'insensitive' } };
  }
  return {
    OR: variants.map((v) => ({ city: { equals: v, mode: 'insensitive' } })),
  };
}
