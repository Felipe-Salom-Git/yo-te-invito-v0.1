# V3.1 Etapa 16 — Banners editoriales sin reemplazar publicaciones (cierre)

**Fecha:** 2026-06-15  
**Rama:** `feat/v1-s03-api-foundation`

---

## Causa del bug

En el frontend, `useCategoryHeroBanner` aplicaba la regla *«editorial tiene prioridad»* vaciando `eventItems` cuando existía al menos un banner editorial activo:

```ts
eventItems: hasEditorial ? [] : (events.data?.data ?? []),
```

`CategoryHeroBanner` solo renderizaba editoriales **o** eventos en el hero (no ambos). En categorías con poco contenido en carruseles (filtros estrictos de recomendados / próximos), el hero era la única superficie visible de publicaciones reales; al crear un banner editorial, esa superficie quedaba reemplazada por contenido estático promocional.

El backend ya separaba endpoints (`/public/category-editorial-banners` vs `/public/category-banners` y listados de eventos). No había lógica server-side que ocultara publicaciones.

Copy en Admin reforzaba el comportamiento incorrecto (*«reemplazan el carrusel de eventos destacados»*).

---

## Fix backend

Sin cambios funcionales. Se amplió el smoke `smoke:v31-category-banners` para validar que crear/desactivar banners editoriales no altera el conteo de publicaciones `APPROVED` en la categoría event.

---

## Fix frontend

| Archivo | Cambio |
|---------|--------|
| `useCategoryHeroBanner.ts` | Siempre expone `eventItems`; loading del hero no bloquea por eventos cuando hay editoriales. |
| `CategoryEventBannerRail.tsx` | Nuevo carrusel «Destacados» con publicaciones del endpoint de category banners cuando hay hero editorial. |
| `categoryBannerCards.ts` | Mapper banner → `ContentCardItem`. |
| `CategoryLandingPage.tsx` | Hero editorial + rail de publicaciones + carruseles existentes. |
| `EventDiscoveryContent.tsx` | Misma composición para Eventos. |
| `AdminCategoryEditorialBannerPanel.tsx` | Copy: banners complementarios, no reemplazo. |
| `AdminSubcategoriesPageClient.tsx` | Copy del panel de publicaciones destacadas actualizado. |

Comportamiento resultante:

1. Banner editorial → hero promocional arriba (carrusel si hay varios).
2. Publicaciones reales del endpoint de banners → carrusel «Destacados» debajo del hero editorial.
3. Carruseles de categoría (`useCategoryCarousels`) y «Más para hacer» (`CrossCategoryRails`) sin cambios.
4. Sin banners editoriales → hero con eventos destacados (fallback anterior).

---

## Pantallas revisadas

- Home (sin banners editoriales de categoría — sin regresión)
- `/categoria/eventos` (`EventDiscoveryContent`)
- `/categoria/gastro`, `/categoria/excursiones`, `/categoria/rentals` (`CategoryLandingPage`)
- Admin → Subcategorías → Banners editoriales

---

## QA Admin

| Caso | Resultado |
|------|-----------|
| Crear múltiples banners | Pendiente QA manual — smoke valida 2 banners + orden |
| Reordenar | Smoke OK (swap) |
| Desactivar/reactivar | Smoke OK |

---

## QA Público

| Pantalla | Resultado |
|----------|-----------|
| Home | Pendiente QA manual — sin editoriales de categoría en home |
| Eventos | Pendiente QA manual — hero editorial + destacados + carruseles |
| Gastro | Pendiente QA manual |
| Rentals | Pendiente QA manual |
| Excursiones | Pendiente QA manual |

---

## Smoke

```bash
pnpm --filter api run smoke:v31-category-banners
```

Validaciones añadidas:

- Baseline de publicaciones aprobadas en categoría event.
- Banners editoriales smoke activos en set público.
- Conteo de publicaciones intacto tras create y tras deactivate.
- Cleanup solo de IDs `SMOKE_`.

---

## Pendientes

- QA manual en staging con banners reales + publicaciones en cada categoría.
- Home no consume banners editoriales por categoría; si producto lo pide, agregar bloque editorial en `HomeLanding` como slice aparte.
