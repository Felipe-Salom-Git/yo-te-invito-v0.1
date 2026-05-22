import type { RentalGalleryImage } from '@/lib/rentals/productGallery';

export function buildHotelGalleryImages(
  bannerUrl: string | null | undefined,
  logoUrl: string | null | undefined,
  galleryUrls: string[] | null | undefined,
): RentalGalleryImage[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  const push = (url: string | null | undefined) => {
    const t = url?.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    urls.push(t);
  };
  push(bannerUrl);
  push(logoUrl);
  for (const u of galleryUrls ?? []) push(u);
  return urls.map((url, i) => ({ id: `hotel-${i}`, url }));
}
