import type { CreateRentalProductBody, UpdateRentalProductBody } from '@yo-te-invito/shared';

export function normalizeRentalProductImages(
  body: Pick<
    CreateRentalProductBody | UpdateRentalProductBody,
    'headerImageUrl' | 'coverImageUrl' | 'galleryImages' | 'media'
  >,
): {
  headerImageUrl: string | null | undefined;
  galleryMedia: Array<{ type: 'IMAGE' | 'VIDEO'; url: string; sortOrder: number }> | undefined;
} {
  const header =
    body.headerImageUrl !== undefined
      ? body.headerImageUrl
      : body.coverImageUrl !== undefined
        ? body.coverImageUrl
        : undefined;

  if (body.galleryImages !== undefined) {
    const galleryMedia = body.galleryImages.map((img, i) => ({
      type: (img.type ?? 'IMAGE') as 'IMAGE' | 'VIDEO',
      url: img.url,
      sortOrder: i,
    }));
    return { headerImageUrl: header, galleryMedia };
  }

  if (body.media !== undefined) {
    const galleryMedia = body.media.map((m, i) => ({
      type: m.type as 'IMAGE' | 'VIDEO',
      url: m.url,
      sortOrder: m.sortOrder ?? i,
    }));
    return { headerImageUrl: header, galleryMedia };
  }

  return { headerImageUrl: header, galleryMedia: undefined };
}
