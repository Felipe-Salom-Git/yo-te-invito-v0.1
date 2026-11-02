'use client';

import { RentalGalleryThumbnails } from '@/components/rentals/RentalGalleryThumbnails';
import { buildEventGalleryImages } from '@/lib/events/eventGallery';

type Props = {
  media?: Array<{ id: string; type: string; url: string; sortOrder?: number }>;
  coverImageUrl?: string | null;
};

/** Event detail gallery (swipe lightbox, same as the other public fichas). */
export function EventGallerySection({ media, coverImageUrl }: Props) {
  const images = buildEventGalleryImages(media, coverImageUrl);
  if (images.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-white">Galería</h2>
      <div className="mt-4">
        <RentalGalleryThumbnails images={images} />
      </div>
    </section>
  );
}
