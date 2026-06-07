export type RentalGalleryImage = { id: string; url: string };

/** Header/cover image for hero background (not repeated in gallery). */
export function getRentalHeaderImageUrl(event: {
  coverImageUrl?: string | null;
}): string | null {
  const cover = event.coverImageUrl?.trim();
  return cover || null;
}

/** Gallery images only — excludes header/cover. */
export function buildRentalGalleryOnlyImages(event: {
  coverImageUrl?: string | null;
  media?: Array<{ id: string; url: string; type?: string; sortOrder?: number }>;
}): RentalGalleryImage[] {
  const cover = event.coverImageUrl?.trim() ?? '';
  const seen = new Set<string>();
  if (cover) seen.add(cover);

  const items: RentalGalleryImage[] = [];
  const sortedMedia = [...(event.media ?? [])].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
  );
  for (const m of sortedMedia) {
    const url = m.url?.trim();
    if (!url || seen.has(url)) continue;
    if (m.type && m.type !== 'image' && m.type !== 'IMAGE') continue;
    seen.add(url);
    items.push({ id: m.id, url });
  }
  return items;
}
