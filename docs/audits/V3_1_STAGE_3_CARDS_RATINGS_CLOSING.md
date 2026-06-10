# V3.1 Etapa 3 — Cierre cards editoriales y ratings 5/5

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`

## 1. Objetivo

Fase 2 de cards públicas por vertical y cierre de escala visual **5/5** en reviews (formularios, filtros, portales, admin UI, JSON-LD).

## 2. Slices ejecutados

| Slice | Commit | Resumen |
| ----- | ------ | ------- |
| 3.1 | `style(web): refine event editorial cards` | Helpers + card evento: fecha afiche, venue·ciudad, precio, productora |
| 3.2 | `style(web): add excursion card metadata variant` | Sin fecha evento; operador/duración/CTA experiencia |
| 3.3 | `style(web): add gastro card metadata variant` | Rating destacado, cupón, subcategoría; link `/restaurants/[id]` |
| 3.4 | `style(web): add rental card metadata variant` | Local·subcategoría, CTA disponibilidad, sin precio evento |
| 3.5 | `feat(web): use five-star review inputs` | `RatingInput` visual 5 ↔ interno 10 |
| 3.6 | `fix(web): display review filters as five-star scale` | Filtros públicos y portales |
| 3.7 | `refactor(web): normalize review rating displays` | Admin, productor, gastro/hotel valoraciones |
| 3.8 | `docs: close v31 stage 3 cards ratings` | JSON-LD `bestRating: 5` + este doc |

## 3. Cards por vertical

| Vertical | Metadata en card | Oculto |
| -------- | ---------------- | ------ |
| Evento | Fecha `startAt`, venue·ciudad, precio, productora, subcategoría | Fecha alta |
| Excursión | Subcategoría, ciudad, operador/duración (si payload), CTA | Fecha, precio ticket |
| Gastro | Subcategoría, ciudad, rating 5/5, cupón promo | Fecha, precio |
| Rental | Alquiler + subcategoría, local·ciudad, CTA disponibilidad | Fecha, precio, productora |

Helpers: `lib/home/contentCardPresentation.ts`.

## 4. Estrategia ratings

- **Interno:** 1–10 (DB/API sin cambios).
- **Visual público:** 5 estrellas vía `ratingDisplay.ts`.
- **Conversión:** `visualStarsToInternalTen` / `internalTenToVisualStars` / `ratingTenToFive`.
- **B2B comercial** productor↔referido: sigue 1–10 (`RatingInput scale="internal"`).
- **CSV admin:** export mantiene escala interna 1–10 (documentado en UI).

## 5. Pantallas revisadas

- Cards: home, explore, categorías, modal preview.
- Reviews: `ReviewForm`, `PublicReviewsFiltersBar`, `ManagedReviewsCommentsPage`.
- Portales: `/producer/comments`, `/gastro/valoraciones`, `/hotel/valoraciones`.
- Admin: `/admin/reviews`, `/admin/review-disputes`.

## 6. JSON-LD

`buildAggregateRating` emite `ratingValue` en escala 5, `bestRating: 5`, `worstRating: 1`.

## 7. QA ejecutado

| Área | Build | Manual browser |
| ---- | ----- | -------------- |
| Cards por vertical | ✓ | Pendiente |
| Formulario review 5★ | ✓ | Pendiente |
| Filtros 5★ | ✓ | Pendiente |
| Admin/portal /5 | ✓ | Pendiente |
| JSON-LD | ✓ código | Pendiente Rich Results |

## 8. Pendientes / riesgos

- QA manual browser (matriz arriba).
- `durationText` / `scheduleNotes` en list API de excursiones — card usa campos si existen; listado actual puede mostrar solo operador (`venueName`).
- Valoraciones B2B comercial siguen en 1–10 (intencional).
- Migración real DB a escala 1–5: fuera de alcance.

## 9. Comandos

```bash
pnpm --filter web run build
```
