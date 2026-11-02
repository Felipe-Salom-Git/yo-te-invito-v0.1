import type { RentalGalleryImage } from '@/lib/rentals/productGallery';

/**
 * G12.2 — Event detail gallery: IMAGE media in order, without repeating the hero cover.
 * G12.2 — Galería de la ficha de evento: imágenes en orden, sin repetir la portada.
 */
export function buildEventGalleryImages(
  media: Array<{ id: string; type: string; url: string; sortOrder?: number }> | undefined,
  coverImageUrl?: string | null,
): RentalGalleryImage[] {
  const cover = coverImageUrl?.trim();
  const seen = new Set<string>();
  return [...(media ?? [])]
    .filter((m) => m.type === 'IMAGE')
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .filter((m) => {
      const url = m.url.trim();
      if (!url || url === cover || seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .map((m) => ({ id: m.id, url: m.url.trim() }));
}
