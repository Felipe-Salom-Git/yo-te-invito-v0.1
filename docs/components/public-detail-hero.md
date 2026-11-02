# Public detail hero layout

`apps/web/lib/ui/publicHeroLayout.ts` — G12.3 (V3.3)

## Problem (mobile)

The full-bleed heroes of `/gastronomicos/:id`, `/events/:id` (and places), `/hoteles/:id`,
`/excursiones/:id` and `/rentals/:id` were a **fixed-height** box (`h-[40vh] min-h-[280px]`, rentals
`h-[34vh] … max-h-[360px]`) with `overflow-hidden` and a `h-full flex-col justify-end` content block.
When logo + title + Compartir + summary + chips + actions were taller than the box (gastro on a phone),
the content overflowed **upwards** and was clipped at the hero top, right under the navbar: title and
share partially / totally hidden at `scrollY = 0`. The navbar itself is `sticky` (in flow), so it never
covers the page; no extra `padding-top` is needed.

## Rule

| Class | Value |
|-------|-------|
| `PUBLIC_DETAIL_HERO_SECTION_CLASS` | `relative flex flex-col overflow-hidden bg-black`, `min-h-[max(280px,40vh)]`, `md:min-h-[max(400px,50vh)]` |
| `PUBLIC_DETAIL_HERO_CONTENT_CLASS` | `relative flex flex-1 flex-col justify-end` + previous paddings |
| `PUBLIC_RENTAL_HERO_*` | same, with the rental minimums (`max(220px,34vh)` / `sm:max(260px,40vh)` / `md:max(400px,50vh)`) |

Short content → same height as before (desktop 400px / mobile 40vh). Tall content → the hero grows
downwards. Background image / gradients stay `absolute inset-0`.

Safe area: the app does not set `viewport-fit=cover`, so the browser keeps the page out of the notch
and the in-flow navbar needs no `safe-area-inset-top` offset (the assert enforces it if that changes).

Not affected (no full-bleed hero): `/producers/:id` (card hero), `/descuentos/:id`, `/content/:id`,
`/rentals/locales/:id` (`PageContainer`).

Assert: `pnpm --filter api run test:public-hero-layout`.
