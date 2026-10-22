import {
  GASTRO_CONTENT_GALLERY_MAX,
  normalizeGastroContentGalleryUrls,
  resolveGastroContentGalleryUrls,
} from '@yo-te-invito/shared';

export function gastroContentGalleryFromItem(item: {
  imageUrl?: string | null;
  galleryUrls?: string[] | null;
}): string[] {
  return resolveGastroContentGalleryUrls({
    imageUrl: item.imageUrl,
    galleryUrls: item.galleryUrls,
  });
}

export function appendGastroContentGalleryUrl(current: string[], url: string): string[] {
  const next = normalizeGastroContentGalleryUrls([...current, url]);
  return next.slice(0, GASTRO_CONTENT_GALLERY_MAX);
}

export function removeGastroContentGalleryUrl(current: string[], url: string): string[] {
  return current.filter((u) => u !== url);
}

export function moveGastroContentGalleryUrl(
  current: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= current.length ||
    toIndex >= current.length ||
    fromIndex === toIndex
  ) {
    return current;
  }
  const next = [...current];
  const [item] = next.splice(fromIndex, 1);
  if (!item) return current;
  next.splice(toIndex, 0, item);
  return next;
}
