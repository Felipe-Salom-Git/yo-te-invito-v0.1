'use client';

import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react';
import {
  resolveGallerySwipeStep,
  resolveGestureAxis,
  stepGalleryIndex,
  type GestureAxis,
} from '@/lib/ui/gallerySwipe';

export type LightboxImage = {
  id: string;
  url: string;
  alt?: string | null;
};

type ImageGalleryLightboxProps = {
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  label?: string;
};

type TouchState = { startX: number; startY: number; dx: number; axis: GestureAxis | null };

/**
 * Fullscreen image viewer shared by every public gallery: arrows, keyboard and touch swipe.
 * Visor de imágenes compartido por todas las galerías públicas: flechas, teclado y swipe.
 */
export function ImageGalleryLightbox({
  images,
  index,
  onIndexChange,
  onClose,
  label = 'Galería de imágenes',
}: ImageGalleryLightboxProps) {
  const count = images.length;
  const hasMany = count > 1;
  const rootRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<TouchState | null>(null);
  const [dragX, setDragX] = useState(0);

  const goPrev = useCallback(() => {
    if (hasMany) onIndexChange(stepGalleryIndex(index, -1, count));
  }, [hasMany, index, count, onIndexChange]);

  const goNext = useCallback(() => {
    if (hasMany) onIndexChange(stepGalleryIndex(index, 1, count));
  }, [hasMany, index, count, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, goPrev, goNext]);

  const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    // A second finger means pinch-zoom: never treat it as a swipe.
    if (!hasMany || e.touches.length !== 1) {
      touchRef.current = null;
      setDragX(0);
      return;
    }
    const t = e.touches[0]!;
    touchRef.current = { startX: t.clientX, startY: t.clientY, dx: 0, axis: null };
  };

  const onTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const state = touchRef.current;
    if (!state || e.touches.length !== 1) return;
    const t = e.touches[0]!;
    const dx = t.clientX - state.startX;
    const dy = t.clientY - state.startY;
    if (!state.axis) state.axis = resolveGestureAxis(dx, dy);
    if (state.axis !== 'x') return;
    state.dx = dx;
    setDragX(dx);
  };

  const onTouchEnd = () => {
    const state = touchRef.current;
    touchRef.current = null;
    setDragX(0);
    if (!state || state.axis !== 'x') return;
    const width = rootRef.current?.clientWidth ?? window.innerWidth;
    const step = resolveGallerySwipeStep(state.dx, width);
    if (step === 1) goNext();
    if (step === -1) goPrev();
  };

  const active = images[index];
  if (!active) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex touch-pan-y touch-pinch-zoom items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/85"
        onClick={onClose}
        aria-label="Cerrar galería"
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-2xl text-white hover:bg-black/80"
        aria-label="Cerrar"
      >
        ×
      </button>

      {hasMany && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-2xl text-white hover:bg-black/80 sm:left-4"
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
            className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-2xl text-white hover:bg-black/80 sm:right-4"
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active.id}
          src={active.url}
          alt={active.alt ?? `Imagen ${index + 1} de ${count}`}
          draggable={false}
          className={`max-h-[75vh] w-auto max-w-full select-none rounded-lg object-contain shadow-2xl ${
            dragX === 0 ? 'transition-transform duration-200 ease-out' : ''
          }`}
          style={dragX !== 0 ? { transform: `translateX(${dragX}px)` } : undefined}
        />
        {hasMany ? (
          <p className="mt-3 text-sm text-white/80" aria-live="polite">
            {index + 1} / {count}
          </p>
        ) : null}
      </div>
    </div>
  );
}
