'use client';

import { useState } from 'react';
import type { ProducerGalleryItem } from '@/repositories/interfaces';

type Props = {
  items: ProducerGalleryItem[];
  coverImageUrl?: string | null;
};

export function PublicProducerGallery({ items, coverImageUrl }: Props) {
  const cover = coverImageUrl?.trim();
  const gallery = items.filter((g) => g.url.trim() && g.url.trim() !== cover);

  if (gallery.length === 0) return null;

  const [active, setActive] = useState<number | null>(null);

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

      {active !== null && gallery[active] ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal
          onClick={() => setActive(null)}
        >
          <img
            src={gallery[active].url}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </section>
  );
}
