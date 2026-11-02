'use client';

import { useCallback, useState } from 'react';
import { HORIZONTAL_SCROLL_RAIL_CLASS } from '@/lib/ui/horizontalScrollClasses';
import type { RentalGalleryImage } from '@/lib/rentals/productGallery';
import { ImageGalleryLightbox } from '@/components/ui/ImageGalleryLightbox';

type RentalGalleryThumbnailsProps = {
  images: RentalGalleryImage[];
};

const THUMB_SIZE = 'w-[7.25rem] shrink-0 snap-start sm:w-32';

export function RentalGalleryThumbnails({ images }: RentalGalleryThumbnailsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const close = useCallback(() => setOpenIndex(null), []);

  if (images.length === 0) return null;

  return (
    <>
      <ul
        className={`-mx-1 ${HORIZONTAL_SCROLL_RAIL_CLASS} gap-2.5 px-1 pb-2 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:thin] sm:gap-3`}
        aria-label="Galería de imágenes"
      >
        {images.map((img, index) => (
          <li key={img.id} className={THUMB_SIZE}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="group aspect-square w-full overflow-hidden rounded-lg border border-border bg-bg-muted transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <img
                src={img.url}
                alt={`Imagen ${index + 1} de ${images.length}`}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
            </button>
          </li>
        ))}
      </ul>

      {openIndex !== null && (
        <ImageGalleryLightbox
          images={images}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={close}
        />
      )}
    </>
  );
}
