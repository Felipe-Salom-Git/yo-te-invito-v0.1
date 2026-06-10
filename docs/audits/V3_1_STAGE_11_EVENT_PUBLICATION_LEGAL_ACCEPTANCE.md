# V3.1 Etapa 11 — Slice 11.3 — Aceptación `EVENT_PUBLICATION`

**Fecha:** 2026-06-10

---

## Modelo / migración

**Migración:** `20260610130000_event_publication_legal_acceptance`

| Cambio | Detalle |
|--------|---------|
| Enum `LegalAcceptanceContext` | + `EVENT_PUBLICATION` |
| `UserLegalAcceptance.eventId` | `String @default("")` — vacío para contextos globales; `eventId` real para publicación |
| Unique | `[userId, documentVersionId, context, eventId]` |

---

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/producer/events/:eventId/legal/publication-terms` | Estado: doc publicado, versión, aceptación vigente |
| POST | `/producer/events/:eventId/legal/accept-publication-terms` | Registra aceptación idempotente |

**Servicio:** `EventPublicationLegalService` (`apps/api/src/modules/legal/event-publication-legal.service.ts`)

**Validaciones:**
- Usuario con acceso al evento (productora dueña o ADMIN).
- Solo versión `PUBLISHED` de `producer_terms`.
- Error `LEGAL_DOCUMENT_NOT_PUBLISHED` si no hay versión publicada.

---

## Schemas shared

- `packages/shared/src/schemas/event-publication-legal.ts`
- `EventPublicationLegalStatus`, `EventPublicationLegalAcceptResponse`
- Error codes: `LEGAL_ACCEPTANCE_REQUIRED`, `LEGAL_DOCUMENT_NOT_PUBLISHED`

---

## Frontend

| Componente | Cambio |
|------------|--------|
| `ProducerEventPublicationLegalNotice` | Status API + botón «Registrar aceptación» |
| `ProducerEventEditForm` | Recibe `eventId`; gate en paso 3 |
| `lib/query/producer-event-legal.ts` | Hooks TanStack Query |
| `EventsRepo` | `getEventPublicationLegalStatus`, `acceptEventPublicationTerms` |

**Create wizard:** solo borrador — aceptación en edición antes de enviar a revisión.

---

## QA

| Escenario | Esperado |
|-----------|----------|
| Aceptar términos para evento | ✅ POST registra fila con `context=EVENT_PUBLICATION`, `eventId` |
| Reintentar aceptación | ✅ `alreadyAccepted: true` |
| Usuario ajeno | ✅ 403 FORBIDDEN |
| Doc no publicado | ✅ `LEGAL_DOCUMENT_NOT_PUBLISHED` |
| Smoke | `pnpm --filter api run smoke:v31-event-publication-legal` |

---

## Pendiente Slice 11.4

- Bloqueo backend en `PATCH` evento `DRAFT → PENDING` sin aceptación.
- Deshabilitar botón guardar en UI cuando `status=pending` sin aceptación.
