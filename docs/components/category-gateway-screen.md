# Category Gateway Screen

## Purpose

Post-splash **editorial poster-style** landing. Mobile-first 2×2 visual tile grid for category selection before home/explore browsing.

## Components

| File | Role |
|------|------|
| `CategoryGatewayScreen.tsx` | Full-viewport layout, tile grid |
| `CategoryGatewayHero.tsx` | Headline, location subtitle, small logo |
| `CategoryGatewayTile.tsx` | Image tile with overlay text |
| `lib/home/categoryGatewayConfig.ts` | Copy, images, routing, location constant |

## Flow

1. `/` when `shouldShowIntro()` → splash → gateway (fixed overlay `z-[100]`).
2. Tile click → `getCategoryGatewayHref(id)`.
3. **Eventos / Gastronomía / Excursiones** → `/home?category=…`
4. **Equipos y Rentals** → `/explore?category=rental`

## Categories

| Tile | Id | Navigation |
|------|-----|------------|
| EVENTOS | `event` | `/home?category=event` |
| GASTRONOMÍA | `gastro` | `/home?category=gastro` |
| EQUIPOS Y RENTALS | `rental` | `/explore?category=rental` |
| EXCURSIONES | `excursion` | `/home?category=excursion` |

## Location copy

`CATEGORY_GATEWAY_LOCATION` in config (default `BARILOCHE`). Subtitle accent: `EN {LOCATION}.`

## Images

Curated Unsplash URLs in config (`imageSrc`). Rendered via `<img>` with bottom gradient overlay for text contrast.

## Dependencies

- `Logo` (small icon variant)
- Tailwind + `.gateway-poster-title` in `globals.css`
- Subtle Framer Motion on hero/tiles only
