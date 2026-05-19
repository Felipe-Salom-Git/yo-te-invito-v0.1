'use client';

import { useRef, useState, useEffect } from 'react';

export interface EventGallerySectionProps {
  /** Cover image URL (shown first) */
  coverImageUrl?: string | null;
  /** Additional media items from event.media */
  media?: Array<{ id: string; url: string; type?: string }>;
  /** Omit default section top margin (e.g. inside a grid row) */
  noSectionMargin?: boolean;
  /** Hide the "Galería" heading */
  hideTitle?: boolean;
}

export function EventGallerySection({
  coverImageUrl,
  media = [],
  noSectionMargin = false,
  hideTitle = false,
}: EventGallerySectionProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const images: { id: string; url: string }[] = [];
  if (coverImageUrl) {
    images.push({ id: 'cover', url: coverImageUrl });
  }
  for (const m of media) {
    if (m.url && (m.type === 'image' || !m.type)) {
      images.push({ id: m.id, url: m.url });
    }
  }
  const deduped = images.filter(
    (img, i, arr) => arr.findIndex((x) => x.url === img.url) === i
  );

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(
      el.scrollLeft < el.scrollWidth - el.clientWidth - 1
    );
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    el.addEventListener('scroll', updateScrollState);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', updateScrollState);
    };
  }, [deduped.length]);

  if (deduped.length === 0) return null;

  const sectionClass = noSectionMargin ? undefined : 'mt-10';
  const title = !hideTitle ? (
    <h2 className="text-lg font-semibold text-white mb-4">Galería</h2>
  ) : null;

  if (deduped.length === 1) {
    return (
      <section className={sectionClass}>
        {title}
        <div className="overflow-hidden rounded-xl border border-border">
          <img
            src={deduped[0].url}
            alt=""
            className="w-full aspect-[16/10] object-cover"
          />
        </div>
      </section>
    );
  }

  return (
    <section className={sectionClass}>
      {title}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0"
        >
          {deduped.map((img) => (
            <div
              key={img.id}
              className="flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] aspect-video rounded-lg overflow-hidden border border-border/80 bg-bg-muted"
            >
              <img
                src={img.url}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
        {canScrollLeft && (
          <div className="pointer-events-none absolute left-0 top-0 bottom-4 w-12 bg-gradient-to-r from-bg to-transparent md:hidden" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-bg to-transparent md:hidden" />
        )}
      </div>
    </section>
  );
}
