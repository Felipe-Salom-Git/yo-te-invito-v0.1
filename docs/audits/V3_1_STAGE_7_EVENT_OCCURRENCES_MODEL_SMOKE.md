# V3.1 Etapa 7 Slice 7.1 — Event Occurrences Model Smoke

**Fecha:** 2026-06-10  
**Slice:** 7.1 — Diseño técnico modelo múltiples fechas  
**Estado:** OK

---

## Decisión de modelo

**Opción A elegida:** `TicketType.occurrenceId` opcional (FK a `EventOccurrence`).

| Criterio | Opción A | Opción B (join table) |
|----------|----------|------------------------|
| Compatibilidad legacy | `occurrenceId = null` sin cambios | Requiere migrar todos los tipos |
| Stock por fecha | Stock ya vive en `TicketType` / `TicketBatch` | Duplicar lógica de stock |
| Tamaño del diff | 1 columna nullable | Modelo + servicios nuevos |
| Riesgo checkout/scanner | Bajo — sin tocar flujos existentes | Mayor — nueva capa de indirección |

**Modelo nuevo:** `EventOccurrence` — fecha/función de un evento multi-fecha.

- Campos: `startAt`, `endAt`, `venueName`, `venueAddress`, `city`, `province`, `geoLat`, `geoLng`, `googlePlaceId`, `capacity`, `status` (`ACTIVE` \| `PAUSED` \| `CANCELLED`), `sortOrder`.
- Relación: `Event` 1→N `EventOccurrence`; `EventOccurrence` 1→N `TicketType` (opcional).
- **`Event.startAt` se mantiene** para discovery, cards, checkout y scanner legacy.

---

## Migración

- `20260617120000_event_occurrences`
- Tabla `EventOccurrence` + enum `EventOccurrenceStatus`
- Columna `TicketType.occurrenceId` nullable + FK

---

## Compatibilidad legacy

| Escenario | Comportamiento |
|-----------|----------------|
| Evento sin occurrences | Single-date; usa `Event.startAt` y ticket types con `occurrenceId = null` |
| Evento con occurrences | Multi-date; helpers en `@yo-te-invito/shared` resuelven próxima fecha visible |
| Checkout / scanner | **Sin cambios** en este slice |

**Helpers (`packages/shared/src/event-occurrences/compat.ts`):**

- `isMultiDateEvent(occurrences)`
- `resolveEventDisplayStartAt(event, occurrences)`
- `resolveNextVisibleOccurrence(occurrences)`
- `resolveEventDisplayVenue(event, occurrence)`
- `deriveEventStartAtFromOccurrences(occurrences)`

---

## Artefactos

| Área | Archivo |
|------|---------|
| Prisma | `apps/api/prisma/schema.prisma` |
| Migración | `apps/api/prisma/migrations/20260617120000_event_occurrences/` |
| Schemas shared | `packages/shared/src/schemas/event-occurrences.ts` |
| Helpers | `packages/shared/src/event-occurrences/compat.ts` |
| Service | `apps/api/src/modules/event-occurrences/event-occurrences.service.ts` |
| Smoke | `apps/api/scripts/smoke-v31-event-occurrences.ts` |

---

## Comandos ejecutados

```bash
pnpm --filter shared run build          # OK
npx prisma migrate deploy               # OK — migration applied
npx nest build                          # OK (prisma generate bloqueado por dev server en Windows)
pnpm --filter api run smoke:v31-event-occurrences  # OK — 18 checks
```

**Nota:** `prisma generate` puede fallar con `EPERM` si `pnpm run -w dev` tiene el query engine bloqueado. Reiniciar dev o cerrar el proceso antes de `pnpm --filter api run build` completo.

---

## QA smoke

- [x] Tabla `EventOccurrence` existe
- [x] `TicketType.occurrenceId` existe
- [x] Evento legacy sin occurrences válido
- [x] Crear/listar occurrences vía service
- [x] Tenant isolation (create cross-tenant → 404)
- [x] `assertTenantMatch` (403 en mismatch)
- [x] Helpers multi-date vs legacy
- [x] Ticket type ligado a occurrence correcta; rechaza occurrence ajena

---

## Pendientes Slice 7.2+

- Endpoints producer CRUD occurrences
- UI `EventOccurrencesEditor` en wizard productora
- Sincronizar `Event.startAt` al guardar fechas (documentar decisión)
- Slice 7.3: ticket types agrupados por fecha
- Slice 7.6+: `occurrenceId` en Order / OrderItem / Ticket / UserCartItem
- Slice 7.8: validación scanner por occurrence
