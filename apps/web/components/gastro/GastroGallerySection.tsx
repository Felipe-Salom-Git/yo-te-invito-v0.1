'use client';

import { RentalGalleryThumbnails } from '@/components/rentals/RentalGalleryThumbnails';

type GastroGallerySectionProps = {
  images: string[];
};

export function GastroGallerySection({ images }: GastroGallerySectionProps) {
  if (images.length === 0) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-text">Galería</h2>
      <div className="mt-4">
        <RentalGalleryThumbnails images={images} />
      </div>
    </section>
  );
}
