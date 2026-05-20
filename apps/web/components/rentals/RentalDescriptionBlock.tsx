'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PREVIEW_MAX_HEIGHT_PX = 260;

type RentalDescriptionBlockProps = {
  productTitle: string;
  description?: string | null;
};

export function RentalDescriptionBlock({
  productTitle,
  description,
}: RentalDescriptionBlockProps) {
  const text = description?.trim() ?? '';
  const previewRef = useRef<HTMLDivElement>(null);
  const [needsMore, setNeedsMore] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const measureOverflow = useCallback(() => {
    const el = previewRef.current;
    if (!el) return;
    setNeedsMore(el.scrollHeight > el.clientHeight + 2);
  }, []);

  useEffect(() => {
    measureOverflow();
    const el = previewRef.current;
    if (!el) return;
    const ro = new ResizeObserver(measureOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, measureOverflow]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [modalOpen]);

  if (!text) return null;

  return (
    <>
      <section className="min-w-0">
        <h2 className="text-lg font-semibold text-white">Detalle</h2>
        <div
          ref={previewRef}
          className="mt-3 max-h-[220px] overflow-hidden text-sm leading-relaxed text-white/80 sm:max-h-[260px] sm:text-base"
          style={{ maxHeight: PREVIEW_MAX_HEIGHT_PX }}
        >
          <p className="whitespace-pre-wrap">{text}</p>
        </div>
        {needsMore && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="mt-3 text-sm font-medium text-accent hover:text-accent-hover"
          >
            Leer más
          </button>
        )}
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rental-detail-modal-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/85"
            onClick={() => setModalOpen(false)}
            aria-label="Cerrar"
          />
          <div className="relative z-10 flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-white/10 bg-bg shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
              <h3
                id="rental-detail-modal-title"
                className="text-lg font-semibold text-white"
              >
                {productTitle}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-white/70 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/85 sm:text-base">
                {text}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
