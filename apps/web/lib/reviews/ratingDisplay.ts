/**
 * Public rating display — converts internal 1–10 scale to visual 5/5 faces.
 * DB/API/ranking unchanged; use only at render time and in JSON-LD.
 */

export const PUBLIC_RATING_STARS_MAX = 5;
export const INTERNAL_RATING_MAX = 10;

export type VisualFaceLevel = 1 | 2 | 3 | 4 | 5;

export const VISUAL_FACE_META: Record<
  VisualFaceLevel,
  { glyph: string; label: string; className: string }
> = {
  1: { glyph: '😠', label: 'Muy insatisfecho', className: 'text-red-500' },
  2: { glyph: '🙁', label: 'Insatisfecho', className: 'text-orange-400' },
  3: { glyph: '😐', label: 'Neutral', className: 'text-yellow-400' },
  4: { glyph: '🙂', label: 'Conforme', className: 'text-lime-400' },
  5: { glyph: '😊', label: 'Muy conforme', className: 'text-accent' },
};

export function ratingTenToFive(rating10: number): number {
  return Math.round((rating10 / 2) * 10) / 10;
}

/** Whole face level (1–5) from internal 1–10 — for inputs/filters. */
export function internalTenToVisualStars(rating10: number): VisualFaceLevel {
  return Math.min(PUBLIC_RATING_STARS_MAX, Math.max(1, Math.round(rating10 / 2))) as VisualFaceLevel;
}

/** Internal 1–10 from visual face level (1–5). Form still persists 2/4/6/8/10. */
export function visualStarsToInternalTen(stars: number): number {
  const clamped = Math.min(PUBLIC_RATING_STARS_MAX, Math.max(1, Math.round(stars)));
  return clamped * 2;
}

export function visualFaceMeta(level: number) {
  const clamped = Math.min(5, Math.max(1, Math.round(level))) as VisualFaceLevel;
  return VISUAL_FACE_META[clamped];
}

export function publicFaceFromTen(rating10: number | null | undefined) {
  if (rating10 == null || rating10 <= 0 || !Number.isFinite(rating10)) return null;
  return visualFaceMeta(internalTenToVisualStars(rating10));
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
  const face = publicFaceFromTen(rating10);
  if (!five) return 'Sin valoración';
  return face
    ? `Valoración ${five} de 5, ${face.label}`
    : `Valoración ${five} de 5`;
}

/** Filter option label — e.g. «Muy conforme». */
export function publicStarFilterLabel(stars: number): string {
  return visualFaceMeta(stars).label;
}

/** Collapse internal 1–10 distribution buckets into visual 1–5 counts. */
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
