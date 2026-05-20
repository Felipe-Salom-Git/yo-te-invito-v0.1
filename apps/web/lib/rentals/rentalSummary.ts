const HERO_SUMMARY_FALLBACK_MAX = 160;

/** Hero line under title: summary, or truncated description when summary is empty. */
export function getRentalHeroSummaryText(
  summary?: string | null,
  description?: string | null,
): string | null {
  const s = summary?.trim();
  if (s) return s;

  const d = description?.trim();
  if (!d) return null;

  if (d.length <= HERO_SUMMARY_FALLBACK_MAX) return d;
  return `${d.slice(0, HERO_SUMMARY_FALLBACK_MAX).trimEnd()}…`;
}

export const RENTAL_SUMMARY_MAX_LENGTH = 220;
