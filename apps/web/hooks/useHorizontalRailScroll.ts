'use client';

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

/**
 * Scroll state + arrow handlers for a horizontal rail.
 * Estado de scroll y handlers de flechas para un carrusel horizontal.
 *
 * `deps` must change whenever the rail content changes (item count, loading) so the
 * arrows are recomputed once the cards are rendered.
 */
export function useHorizontalRailScroll(step: number, deps: DependencyList) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  const scrollByDirection = useCallback(
    (dir: 'left' | 'right') => {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
      setTimeout(updateScrollState, 350);
    },
    [step, updateScrollState],
  );

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { scrollRef, canScrollLeft, canScrollRight, updateScrollState, scrollByDirection };
}
