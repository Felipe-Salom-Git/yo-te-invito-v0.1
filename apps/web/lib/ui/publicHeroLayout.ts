/**
 * G12.3 — Shared layout of the full-bleed public detail heroes (gastro, events / places, hotels,
 * activities, rentals).
 * G12.3 — Layout compartido de los heroes de fichas públicas.
 *
 * The hero has a MINIMUM height (never a fixed `h-[..vh]` + `overflow-hidden`): its bottom-anchored
 * content (logo, title, share, summary, chips, actions) grows the hero downwards instead of
 * overflowing upwards and being clipped under the sticky navbar. With short content it looks the
 * same as before (same min heights).
 */
export const PUBLIC_DETAIL_HERO_SECTION_CLASS =
  'relative flex min-h-[max(280px,40vh)] flex-col overflow-hidden bg-black md:min-h-[max(400px,50vh)]';

export const PUBLIC_DETAIL_HERO_CONTENT_CLASS =
  'relative flex flex-1 flex-col justify-end px-4 pb-12 pt-16 sm:px-6 md:px-10 md:pb-16 lg:px-16';

/** Rentals use a shorter hero on phones. */
export const PUBLIC_RENTAL_HERO_SECTION_CLASS =
  'relative flex min-h-[max(220px,34vh)] flex-col overflow-hidden bg-black sm:min-h-[max(260px,40vh)] md:min-h-[max(400px,50vh)]';

export const PUBLIC_RENTAL_HERO_CONTENT_CLASS =
  'relative flex flex-1 flex-col justify-end px-4 pb-8 pt-14 sm:px-6 sm:pb-10 sm:pt-16 md:px-10 md:pb-16 lg:px-16';
