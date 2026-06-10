# V3.1 Etapa 7 Slice 7.2 — Producer Occurrences Smoke

**Fecha:** 2026-06-10  
**Slice:** 7.2 — Productora gestiona múltiples fechas  
**Estado:** OK (código + build)

---

## API

| Endpoint | Descripción |
|----------|-------------|
| `GET /producer/events/:eventId/occurrences` | Lista fechas con stats |
| `POST /producer/events/:eventId/occurrences` | Crear fecha |
| `PATCH /producer/events/:eventId/occurrences/:id` | Editar fecha |
| `DELETE /producer/events/:eventId/occurrences/:id` | Borrar (bloqueado si hay ventas) |

- `ProducerEventsCrudService.getDetail()` incluye `isMultiDate` + `occurrences[]`.
- `EventOccurrencesService.syncEventStartAt()` mantiene `Event.startAt` = próxima fecha visible.

---

## UI productora

- Toggle evento simple / multi-fecha en wizard paso 2.
- `EventOccurrencesEditor` en create/edit.
- Validación wizard: multi-fecha requiere ≥1 occurrence antes de continuar.

---

## QA

| Check | Resultado |
|-------|-----------|
| `pnpm --filter web run build` | OK |
| `npx nest build` | OK |

**Manual:** crear evento multi-fecha, agregar 2 fechas, editar venue/capacity, intentar borrar fecha con tickets vendidos.
