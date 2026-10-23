'use client';

import type { PublicGastroContentItem } from '@/repositories/interfaces';
import { RentalDescriptionBlock } from '@/components/rentals/RentalDescriptionBlock';
import { gastroContentGalleryFromItem } from '@/lib/gastro/gastro-content-gallery';
import { RentalGalleryThumbnails } from '@/components/rentals/RentalGalleryThumbnails';

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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={gallery[0]}
                      alt={item.title ?? 'Imagen de la publicación'}
                      className="aspect-[4/3] w-full max-w-xl rounded-xl object-cover"
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
