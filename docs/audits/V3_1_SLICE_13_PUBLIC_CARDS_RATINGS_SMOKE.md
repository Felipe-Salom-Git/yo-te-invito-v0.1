# V3.1 Slice 13 — Public cards + ratings 5/5 smoke

**Fecha:** 2026-06-14  
**Alcance:** Solo presentación visual. Sin DB/API/Prisma.

## Ratings 5/5

Helper central: `apps/web/lib/reviews/ratingDisplay.ts`

- `ratingTenToFive`, `formatPublicRatingLabel`, `publicRatingAriaLabel`
- Conversión: `rating5 = rating10 / 2` (1 decimal)

**Actualizado (público):** `ContentCard`, `RatingBadge`, `HomeHero`, previews, `EventMetaSummary`, `ReviewSummary/Card/AspectBreakdown`, perfiles públicos, gastro/hotel headers, listado productoras.

**Sin cambiar:** formularios de review (siguen 1–10 interno), admin reportes, producer dashboard.

**Filtros públicos:** etiquetas 5/5; valores API siguen escala 1–10.

## Cards editoriales fase 1

`ContentCard` — estilo afiche:

- Fecha destacada (badge mes/día).
- Imagen protagonista + gradiente.
- Badges sutiles (borde, no bloque accent).
- Título `gateway-poster-title`.
- Ubicación uppercase.
- Rating `/5`.

## Rutas QA visual

`/home`, `/explore`, `/categoria/*`, fichas públicas event/gastro/rental/excursion.

## Comandos

```bash
pnpm exec nx run web:lint
pnpm exec nx run web:build
```

## Pendientes fase 2

- Variantes por vertical si hace falta afinar gastro/rental.
- Formulario de review en escala 5 visual (opcional).
- JSON-LD `bestRating: 5`.
