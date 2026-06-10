/**
 * Public rating display — converts internal 1–10 scale to visual 5/5.
 * DB/API/ranking unchanged; use only at render time and in JSON-LD.
 */

export const PUBLIC_RATING_STARS_MAX = 5;
export const INTERNAL_RATING_MAX = 10;

export function ratingTenToFive(rating10: number): number {
  return Math.round((rating10 / 2) * 10) / 10;
}

/** Whole stars (1–5) from internal 1–10 — for inputs/filters. */
export function internalTenToVisualStars(rating10: number): number {
  return Math.min(PUBLIC_RATING_STARS_MAX, Math.max(1, Math.round(rating10 / 2)));
}

/** Internal 1–10 from visual star count (1–5). */
export function visualStarsToInternalTen(stars: number): number {
  const clamped = Math.min(PUBLIC_RATING_STARS_MAX, Math.max(1, Math.round(stars)));
  return clamped * 2;
}

export function formatPublicRatingValue(
  rating10: number | null | undefined,
  decimals = 1,
): string | null {
  if (rating10 == null || rating10 <= 0 || !Number.isFinite(rating10)) return null;
  return ratingTenToFive(rating10).toFixed(decimals);
}

export function formatPublicRatingLabel(
  rating10: number | null | undefined,
  opts?: { suffix?: boolean; decimals?: number },
): string | null {
  const value = formatPublicRatingValue(rating10, opts?.decimals ?? 1);
  if (!value) return null;
  return opts?.suffix === false ? value : `${value}/5`;
}

export function publicRatingAriaLabel(rating10: number): string {
  const five = formatPublicRatingValue(rating10);
  return five ? `Valoración ${five} de 5` : 'Sin valoración';
}

/** Filter option label — e.g. «5 estrellas». */
export function publicStarFilterLabel(stars: number): string {
  return stars === 1 ? '1 estrella' : `${stars} estrellas`;
}

/** Collapse internal 1–10 distribution buckets into visual 1–5 star counts. */
export function aggregateTenScaleDistribution(
  distribution: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
  for (const [key, count] of Object.entries(distribution)) {
    if (!count) continue;
    const stars = internalTenToVisualStars(Number(key));
    out[String(stars)] = (out[String(stars)] ?? 0) + count;
  }
  return out;
}
