# V3.1 Etapa 7 Slice 7.5 — Public Date Selector Smoke

**Fecha:** 2026-06-10  
**Slice:** 7.5 — Selector de fecha en ficha pública  
**Estado:** OK (código + build)

---

## API

- `PublicEventsService.detail()`: `isMultiDate`, `occurrences[]`.

---

## UI pública

- `EventDateSelector` en `/events/[eventId]`.
- Ticket types recargados al cambiar fecha seleccionada.
- Eventos single-date: sin selector, flujo legacy.

---

## QA

| Check | Resultado |
|-------|-----------|
| `pnpm --filter web run build` | OK |

**Manual:** evento multi-fecha muestra selector; elegir fecha filtra entradas disponibles.
