/**
 * Pure swipe rules for the public image lightbox (no DOM).
 * Reglas puras de swipe del visor de imágenes público (sin DOM).
 */

/** Finger travel before the gesture is locked to an axis. */
export const GALLERY_SWIPE_AXIS_SLOP_PX = 8;
/** Minimum horizontal travel to change image. */
export const GALLERY_SWIPE_MIN_PX = 40;
/** Minimum horizontal travel relative to the viewer width. */
export const GALLERY_SWIPE_MIN_RATIO = 0.12;

export type GestureAxis = 'x' | 'y';

/** Locks the gesture to the dominant axis once it leaves the slop; null while undecided. */
export function resolveGestureAxis(dx: number, dy: number): GestureAxis | null {
  if (Math.abs(dx) < GALLERY_SWIPE_AXIS_SLOP_PX && Math.abs(dy) < GALLERY_SWIPE_AXIS_SLOP_PX) {
    return null;
  }
  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}

/** Swipe left (dx < 0) → next (+1); swipe right → previous (−1); short drag → 0. */
export function resolveGallerySwipeStep(dx: number, viewerWidth: number): -1 | 0 | 1 {
  const threshold = Math.max(GALLERY_SWIPE_MIN_PX, viewerWidth * GALLERY_SWIPE_MIN_RATIO);
  if (Math.abs(dx) < threshold) return 0;
  return dx < 0 ? 1 : -1;
}

/** Circular index, same as the arrows / keyboard navigation. */
export function stepGalleryIndex(index: number, step: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + step) % count) + count) % count;
}
