# V3.1 Etapa 7 Slice 7.4 — Admin Multi-Date Events Smoke

**Fecha:** 2026-06-10  
**Slice:** 7.4 — Admin ve eventos multi-fecha  
**Estado:** OK (código + build)

---

## API

- `AdminEventsService.listForAdmin()`: `isMultiDate`, `occurrenceCount` por evento.
- Schema `adminEventListItemSchema` actualizado.

---

## UI admin

- Badge «Multi-fecha» en `AdminEventsTable` y `AdminEventsMobileCard`.

---

## QA

| Check | Resultado |
|-------|-----------|
| `pnpm --filter web run build` | OK |

**Manual:** listado admin muestra badge en eventos con occurrences.
