# Category Gateway Screen

## Purpose

Post-splash **editorial poster-style** landing. Mobile-first 2×2 visual tile grid for category selection before home/explore browsing.

## Components

| File | Role |
|------|------|
| `CategoryGatewayScreen.tsx` | Full-viewport layout, tile grid, footer nav |
| `CategoryGatewayHero.tsx` | Headline, location subtitle, small logo |
| `CategoryGatewayTile.tsx` | Image tile with overlay text |
| `CategoryGatewayFooter.tsx` | Links to `/home` and `/explore` |
| `lib/home/categoryGatewayConfig.ts` | Copy, images, routing, location constant |

## Flow

1. `/` when `shouldShowIntro()` → splash → gateway (fixed overlay `z-[100]`).
2. `/` when intro seen within 24h → `replace` to `/home` (no splash/gateway).
3. `/categorias` → same grid without splash (`variant="page"`, site navbar).
4. Tile click → `getCategoryGatewayHref(id)` → `/categoria/{category}`.
5. Footer: **Ir al inicio** → `/home`, **Explorar todo** → `/explore`.

## Categories (2×2, no hotel)

| Tile | Id | Navigation |
|------|-----|------------|
| EVENTOS | `event` | `/categoria/event` |
| GASTRONOMÍA | `gastro` | `/categoria/gastro` |
| EQUIPOS Y RENTALS | `rental` | `/categoria/rental` |
| EXCURSIONES | `excursion` | `/categoria/excursion` |

## Copy

Defined in `categoryGatewayConfig.ts`:

- `CATEGORY_GATEWAY_HEADLINE` — ¿QUÉ QUERÉS HACER HOY?
- Subtitle — ENCONTRÁ TODO LO QUE HAY PARA HACER **EN BARILOCHE.**

## Images

Curated Unsplash URLs in config (`imageSrc`). Rentals tile uses kayaks/aventura (no alojamiento). Bottom gradient overlay for text contrast.

## Dependencies

- `Logo` (small icon variant on overlay)
- Tailwind + `.gateway-poster-title` in `globals.css`
- Subtle Framer Motion on hero/tiles only (no glow/QR decor)
