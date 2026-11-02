# ImageGalleryLightbox

`apps/web/components/ui/ImageGalleryLightbox.tsx` — G11.1 (V3.3)

## Purpose

Single fullscreen image viewer for every public gallery. Replaces the inline modal of
`RentalGalleryThumbnails` and the static modal of `PublicProducerGallery`.

## Inputs

| Prop | Type | Notes |
|------|------|-------|
| `images` | `{ id, url, alt? }[]` | Order = navigation order |
| `index` | `number` | Controlled active index |
| `onIndexChange` | `(index) => void` | Called by arrows, keyboard and swipe |
| `onClose` | `() => void` | Backdrop, `×`, `Escape` |
| `label` | `string?` | Dialog `aria-label` (default «Galería de imágenes») |

## Behaviour

- Arrows `‹ ›` and the `n / N` counter only when there is more than one image.
- Keyboard: `←` / `→` / `Escape`. Locks `body` scroll while open.
- Touch swipe (mobile): the image follows the finger on the horizontal axis; on release
  `resolveGallerySwipeStep` decides next / previous / stay. Vertical drags and two-finger
  (pinch-zoom) gestures never change image. Navigation is circular, like the arrows.
- Pure rules live in `apps/web/lib/ui/gallerySwipe.ts` (threshold `max(40px, 12% width)`,
  axis slop 8px). Assert: `pnpm --filter api run test:public-gallery-swipe`.

## Used by

- `RentalGalleryThumbnails` → Gastro gallery (`GastroGallerySection`), hotel gallery,
  publications with N images (`GastroLocationEditorialSection`), rentals, excursions,
  local preview.
- `GastroLocationEditorialSection` → publication with a single image (tap to enlarge).
- `PublicProducerGallery`.

## Edge cases

- 1 image: opens, no arrows / counter / swipe.
- `index` out of range: renders nothing.
- No new dependencies; desktop behaviour (arrows, keyboard, backdrop close) unchanged.
