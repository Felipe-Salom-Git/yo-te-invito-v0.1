import type { RentalGalleryImage } from '@/lib/rentals/productGallery';

export function buildGastroGalleryImages(
  bannerUrl: string | null | undefined,
  galleryUrls: string[] | null | undefined,
): RentalGalleryImage[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const push = (url: string | null | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    urls.push(trimmed);
  };

  push(bannerUrl);
  for (const url of galleryUrls ?? []) {
    push(url);
  }

  return urls.map((url, index) => ({ id: `gastro-${index}`, url }));
}

export function buildGastroWhatsAppHref(
  displayName: string,
  contactPhone: string | null | undefined,
  fallbackNumber = '5491112345678',
): string {
  const digits = contactPhone?.replace(/\D/g, '') ?? fallbackNumber;
  const text = encodeURIComponent(`Hola, quiero consultar por ${displayName}`);
  return `https://wa.me/${digits}?text=${text}`;
}
