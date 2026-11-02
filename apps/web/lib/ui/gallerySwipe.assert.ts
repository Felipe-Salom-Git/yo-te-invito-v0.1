/**
 * G11.1 — Touch swipe rules of the public image lightbox.
 * Run: pnpm --filter api run test:public-gallery-swipe
 */
import { resolveGallerySwipeStep, resolveGestureAxis, stepGalleryIndex } from './gallerySwipe';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const PHONE_WIDTH = 375;

assert(resolveGallerySwipeStep(-120, PHONE_WIDTH) === 1, 'swipe left → next image');
assert(resolveGallerySwipeStep(120, PHONE_WIDTH) === -1, 'swipe right → previous image');
assert(resolveGallerySwipeStep(-20, PHONE_WIDTH) === 0, 'short drag keeps the image');
assert(resolveGallerySwipeStep(-60, 1440) === 0, 'threshold scales with wide viewers');

assert(resolveGestureAxis(3, 2) === null, 'tiny movement → axis undecided');
assert(resolveGestureAxis(30, 5) === 'x', 'horizontal drag → x axis');
assert(resolveGestureAxis(5, 30) === 'y', 'vertical drag → y axis (no swipe)');

assert(stepGalleryIndex(0, 1, 3) === 1, 'next from first');
assert(stepGalleryIndex(2, 1, 3) === 0, 'next from last wraps to first');
assert(stepGalleryIndex(0, -1, 3) === 2, 'previous from first wraps to last');
assert(stepGalleryIndex(0, 1, 1) === 0, 'single image keeps index 0');
assert(stepGalleryIndex(0, 1, 0) === 0, 'empty gallery is safe');

console.log('OK: public gallery swipe');
