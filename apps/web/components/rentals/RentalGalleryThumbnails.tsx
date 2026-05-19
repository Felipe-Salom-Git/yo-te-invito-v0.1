'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RentalGalleryImage } from '@/lib/rentals/productGallery';

type RentalGalleryThumbnailsProps = {
  images: RentalGalleryImage[];
};

export function RentalGalleryThumbnails({ images }: RentalGalleryThumbnailsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const openAt = (index: number) => {
    setActiveIndex(index);
    setIsOpen(true);
  };

  const close = useCallback(() => setIsOpen(false), []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close, goPrev, goNext]);

  if (images.length === 0) return null;

  const active = images[activeIndex];

  return (
    <>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {images.map((img, index) => (
          <li key={img.id}>
            <button
              type="button"
              onClick={() => openAt(index)}
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

      {isOpen && active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Galería de imágenes"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/85"
            onClick={close}
            aria-label="Cerrar galería"
          />

          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-2xl text-white hover:bg-black/80"
            aria-label="Cerrar"
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-2xl text-white hover:bg-black/80 sm:left-4"
                aria-label="Imagen anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-2xl text-white hover:bg-black/80 sm:right-4"
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            </>
          )}

          <div
            className="relative z-10 flex max-h-[85vh] max-w-5xl flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={active.url}
              alt=""
              className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
            />
            <p className="mt-3 text-sm text-white/80">
              {activeIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
