'use client';

import { useCallback, useState } from 'react';
import type { ProducerGalleryItem } from '@/repositories/interfaces';
import { ImageGalleryLightbox } from '@/components/ui/ImageGalleryLightbox';

type Props = {
  items: ProducerGalleryItem[];
  coverImageUrl?: string | null;
};

export function PublicProducerGallery({ items, coverImageUrl }: Props) {
  const [active, setActive] = useState<number | null>(null);
  const close = useCallback(() => setActive(null), []);

  const cover = coverImageUrl?.trim();
  const gallery = items.filter((g) => g.url.trim() && g.url.trim() !== cover);

  if (gallery.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-text">Galería</h2>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {gallery.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActive(index)}
            className="snap-start shrink-0 overflow-hidden rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <img
              src={item.url}
              alt={item.alt ?? ''}
              className="h-40 w-56 object-cover sm:h-48 sm:w-64"
            />
          </button>
        ))}
      </div>

      {active !== null && (
        <ImageGalleryLightbox
          images={gallery}
          index={active}
          onIndexChange={setActive}
          onClose={close}
        />
      )}
    </section>
  );
}
