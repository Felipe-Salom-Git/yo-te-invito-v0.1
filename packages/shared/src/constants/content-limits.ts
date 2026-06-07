/** Max length for public publication summaries (events, rentals, excursions, gastro local, etc.). */
export const PUBLIC_SUMMARY_MAX_LENGTH = 500;

/** Max length for subtitles / short descriptions (e.g. producer profile). */
export const PUBLIC_SUBTITLE_MAX_LENGTH = 400;

export function trimToPublicSummary(value: string | null | undefined): string | null {
  const t = value?.trim() ?? '';
  return t === '' ? null : t.slice(0, PUBLIC_SUMMARY_MAX_LENGTH);
}

export function trimToPublicSubtitle(value: string | null | undefined): string | null {
  const t = value?.trim() ?? '';
  return t === '' ? null : t.slice(0, PUBLIC_SUBTITLE_MAX_LENGTH);
}
