# V3.2 Slice 6 — Valoraciones con caritas (cierre)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`

## Cambios

- Escala visual 1–5 con caritas (`VISUAL_FACE_META`); DB/API siguen 1–10 (`2/4/6/8/10` en form).
- `ReviewSummary` colapsado: avg + count + carita + **Ver más**.
- `EventReviewsSection`: lista/filtros tras Ver más; form tras **Valorar**.
- `RatingInput` / cards / hero / badge usan caritas (comercial `scale="internal"` conserva ★).

## Validación

`pnpm --filter web run build`
