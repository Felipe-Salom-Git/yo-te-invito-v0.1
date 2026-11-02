'use client';

import { useState } from 'react';
import type { PublicGastroContentItem } from '@/repositories/interfaces';
import { RentalDescriptionBlock } from '@/components/rentals/RentalDescriptionBlock';
import { gastroContentGalleryFromItem } from '@/lib/gastro/gastro-content-gallery';
import { RentalGalleryThumbnails } from '@/components/rentals/RentalGalleryThumbnails';
import { ImageGalleryLightbox } from '@/components/ui/ImageGalleryLightbox';

/** Single publication image: full width, opens the shared lightbox on tap. */
function PublicationSingleImage({ id, url, alt }: { id: string; url: string; alt: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="block w-full max-w-xl overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={`Ampliar imagen: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} className="aspect-[4/3] w-full object-cover" />
      </button>
      {isOpen && (
        <ImageGalleryLightbox
          images={[{ id, url, alt }]}
          index={0}
          onIndexChange={() => undefined}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

type GastroLocationEditorialSectionProps = {
  items: PublicGastroContentItem[];
  locationName: string;
};

export function GastroLocationEditorialSection({
  items,
  locationName,
}: GastroLocationEditorialSectionProps) {
  if (items.length === 0) return null;

  return (
    <section className="space-y-8">
      <h2 className="text-lg font-semibold text-white">Publicaciones</h2>
      <ul className="space-y-8">
        {items.map((item) => {
          const gallery = gastroContentGalleryFromItem(item);
          const hasText = Boolean(item.title?.trim() || item.body?.trim());
          if (!hasText && gallery.length === 0) return null;

          return (
            <li key={item.id} className="min-w-0 space-y-3">
              {item.title?.trim() ? (
                <h3 className="text-base font-semibold text-white">{item.title.trim()}</h3>
              ) : null}
              {item.body?.trim() ? (
                <RentalDescriptionBlock
                  productTitle={item.title?.trim() || locationName}
                  description={item.body}
                  sectionTitle={item.title?.trim() ? null : 'Descripción'}
                />
              ) : null}
              {gallery.length > 0 ? (
                <div className="mt-2">
                  {gallery.length === 1 ? (
                    <PublicationSingleImage
                      id={`${item.id}-0`}
                      url={gallery[0]!}
                      alt={item.title?.trim() || 'Imagen de la publicación'}
                    />
                  ) : (
                    <RentalGalleryThumbnails
                      images={gallery.map((url, index) => ({
                        id: `${item.id}-${index}`,
                        url,
                      }))}
                    />
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
