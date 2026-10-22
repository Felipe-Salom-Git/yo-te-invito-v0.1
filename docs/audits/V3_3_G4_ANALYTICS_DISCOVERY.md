# V3.3 G4.1 — Analytics discovery (Gastro)

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation`

## Qué existe hoy

| Pieza | Uso | Series temporales |
|---|---|---|
| `Event.viewCount` | `POST /public/events/:id/view` → `PublicEngagementService.recordEventView` | **No** (solo contador) |
| `ProducerProfile.viewCount` | `POST /public/producers/:id/view` | **No** |
| Client | `useRecordPublicEventView` / `useRecordPublicProducerView` — **1 POST por mount** (`useRef`), no session dedup | — |
| Skip | ADMIN + owner/manager del recurso | — |
| Gastro ficha | `/gastronomicos/[id]` hoy llama `useRecordPublicEventView(publicEventId)` | Cuenta sobre **Event**, no sobre `GastroProfile` |

No hay `EventView` / `ContentView` / fingerprint / IP logging.

## Decisión G4

1. **Reutilizar el patrón** engagement (POST público + hook once-per-mount + skip owner/admin).
2. **No** basar métricas de local en `Event.viewCount` (multi-local: la vista pertenece a `gastroProfileId`).
3. **Crear** `GastroProfileView` (append-only) + espejo opcional `GastroProfile.viewCount` para total rápido.
4. Métrica = **page views** (cada visita registrada a la ficha), **no** unique visitors.
5. `GastroContent` fuera del dominio de métricas de descuento/local views.

## Definición de view (canónica)

Una **page view** de local = un `POST /public/gastro-locations/:id/view` exitoso (`recorded: true`) disparado desde el cliente de la ficha pública tras montar el detalle con local ACTIVE cargado. No se cuenta prefetch SSR ni renders de portal/admin.
