'use client';

import type { PublicGastroContentItem } from '@/repositories/interfaces';
import { RentalDescriptionBlock } from '@/components/rentals/RentalDescriptionBlock';

type GastroLocationEditorialSectionProps = {
  items: PublicGastroContentItem[];
  locationName: string;
};

export function GastroLocationEditorialSection({
  items,
  locationName,
}: GastroLocationEditorialSectionProps) {
  if (items.length === 0) return null;

  const editorial = items.filter((i) => i.type === 'editorial');
  const images = items.filter((i) => i.type === 'image' && i.imageUrl);

  return (
    <section className="space-y-8">
      {editorial.map((item) => (
        <div key={item.id}>
          {item.title ? (
            <h2 className="text-lg font-semibold text-text">{item.title}</h2>
          ) : null}
          {item.body ? (
            <div className={item.title ? 'mt-3' : ''}>
              <RentalDescriptionBlock
                productTitle={item.title ?? locationName}
                description={item.body}
              />
            </div>
          ) : null}
        </div>
      ))}

      {images.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-text">Más sobre el local</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {images.map((item) => (
              <li
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-bg-muted/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl!}
                  alt={item.title ?? 'Imagen del local'}
                  className="aspect-[4/3] w-full object-cover"
                />
                {item.title || item.body ? (
                  <div className="p-4">
                    {item.title ? (
                      <p className="font-medium text-text">{item.title}</p>
                    ) : null}
                    {item.body ? (
                      <p className="mt-1 text-sm text-text-muted whitespace-pre-wrap">{item.body}</p>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
