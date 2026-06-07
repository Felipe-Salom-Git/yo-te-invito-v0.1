/**
 * Public rating display — converts internal 1–10 scale to visual 5/5.
 * DB/API/ranking unchanged; use only at render time.
 */

export function ratingTenToFive(rating10: number): number {
  return Math.round((rating10 / 2) * 10) / 10;
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
