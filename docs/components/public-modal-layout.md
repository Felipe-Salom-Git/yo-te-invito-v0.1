# Public modal layout (mobile top offset)

`apps/web/lib/ui/publicModalLayout.ts` + `apps/web/styles/globals.css` — G12.1-B (V3.3)

## Problem

Public modals used `fixed inset-0 flex items-center` + panel `max-h-[min(90vh,100dvh)]`. On a phone a
long panel (expanded «Ver similares», long descriptions…) is a centered flex child taller than its
container: it overflows **upwards**, so the title / close / share end up under the navbar area and
cannot be scrolled back into view.

## Rule

| Class | Mobile (< 640px) | sm+ |
|-------|------------------|-----|
| `public-modal-viewport` (wrapper, together with `fixed inset-0 z-*`) | `align-items: flex-start`; `padding-top = safe-area-inset-top + --public-navbar-height + 0.5rem`; bottom padding with safe area; `overflow-y: auto` | centered, `padding: 1rem` |
| `public-modal-panel` (panel) | `max-height = 100dvh − safe areas − navbar − 1.25rem` (fallback `100vh`) | `min(90vh, 100dvh − 2rem)` |

The height never depends on the content: long content scrolls **inside** the panel (`overflow-y-auto` +
`min-h-0` on the body). Body scroll lock is unchanged (`body.style.overflow = 'hidden'` while open).

`--public-navbar-height` (`3.5rem` → `4rem` sm → `4.5rem` md) mirrors `Navbar` (`h-14 sm:h-16 md:h-[4.5rem]`)
and now also drives `html { scroll-padding-top }`.

## Surfaces

`ContentPreviewModal` (minimized preview for gastro, events, activities, rentals, hotels — home,
category landings, event discovery), `ui/Modal` (portal «Ver ficha» `GastroLocalPreviewModal` and every
other generic modal), `PublicDescriptionBlock` («Ver más» of fichas and gastro publications),
`EventLocationModal`, `EventCalendarModal`, `ProducerRatingDistributionModal`.

Public detail **pages** (gastro, events, hotels, activities, rentals, producers, discounts, coupons,
content) already render below the sticky navbar; no change.

Out of scope: fullscreen `ImageGalleryLightbox` and small portal confirm dialogs.

Assert: `pnpm --filter api run test:public-modal-top-offset`.
