# V3.2 Slice 5 — Búsqueda predictiva Explore (cierre)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`  
**Auditoría:** [`V3_2_VISUAL_DISCOVERY_AUDIT.md`](./V3_2_VISUAL_DISCOVERY_AUDIT.md) §7

---

## Objetivo

Sugerencias mientras el usuario escribe, antes de la búsqueda completa en `/explore`.

---

## API

`GET /public/events/suggestions?tenantId=&q=&limit=8`

- `q` mín. 2 caracteres.
- Misma visibilidad pública que listados (`publicWhere`).
- Match multi-campo: título, summary, description, venue, city, category, productora, subcategoría, tags.
- `GET /public/events/search` usa el mismo `publicSearchTextWhere` para `q`.
- Payload liviano + `gastroProfileId` para deep-link gastro.

Schemas: `eventsSuggestionsQuerySchema`, `eventsSuggestionItemSchema`, `eventsSuggestionsResponseSchema`.

---

## Frontend

- `PublicSearchBar`: debounce 300 ms, listbox, flechas/Enter/Escape, click fuera.
- Selección → `getContentDetailHref`.
- Buscar / submit → `/explore?q=...`.
- `useExploreSuggestions` + `exploreKeys.suggestions`.
- Repo: `events.suggestions` (+ `tag` ahora reenviado en `search`).

---

## Slice 10

Filtro de categorías bloqueadas se aplicará sobre search + suggestions en el slice de disponibilidad.

---

## Validaciones

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build
```
