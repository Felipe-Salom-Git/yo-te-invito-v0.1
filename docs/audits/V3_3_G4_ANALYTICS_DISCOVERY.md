# V3.3 G4.1 — Analytics discovery (Gastro)

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation`  
**Estado:** G4 completada

## Qué existe hoy

| Pieza | Uso | Series temporales |
|---|---|---|
| `Event.viewCount` | `POST /public/events/:id/view` → `PublicEngagementService.recordEventView` | **No** (solo contador) |
| `ProducerProfile.viewCount` | `POST /public/producers/:id/view` | **No** |
| Client | `useRecordPublicEventView` / `useRecordPublicProducerView` — **1 POST por mount** (`useRef`), no session dedup | — |
| Skip | ADMIN + owner/manager del recurso | — |
| Gastro ficha | `/gastronomicos/[id]` → `POST /public/gastro-locations/:id/view` | **Sí** via `GastroProfileView` |

No hay fingerprint / IP logging / unique visitors.

## Decisión G4

1. **Reutilizar el patrón** engagement (POST público + hook once-per-mount + skip owner/admin).
2. **No** basar métricas de local en `Event.viewCount` (multi-local: la vista pertenece a `gastroProfileId`).
3. **Crear** `GastroProfileView` (append-only) + espejo opcional `GastroProfile.viewCount` para total rápido.
4. Métrica = **page views** (cada visita registrada a la ficha), **no** unique visitors.
5. `GastroContent` fuera del dominio de métricas de descuento/local views.

## Definición de view (canónica)

Una **page view** de local = un `POST /public/gastro-locations/:id/view` exitoso (`recorded: true`) disparado desde el cliente de la ficha pública tras montar el detalle con local ACTIVE cargado. No se cuenta prefetch SSR ni renders de portal/admin.

## Entregables G4

### Local (GastroProfile)

- Migration `20261022140000_gastro_profile_views`
- `GET /gastro/metrics?profileId=`
- `GET /admin/gastronomicos/:profileId/metrics`
- Portal dashboard + admin location detail panels

### Discount (GastroDiscount)

- Contrato `gastroDiscountOperationalMetricsResponseSchema`
- `GET /gastro/discounts/:id/operational-metrics`
- `GET /admin/gastronomicos/:profileId/discuentos/:discountId/operational-metrics`
- Scope obligatorio: `tenantId` + `gastroProfileId` + `discountId`
- `activityByDay` (30 días, claims + validations, `GASTRO_DISCOUNT_TIMEZONE`)
- Portal discount detail + admin discount detail / expand table

### Unique visitors

**NO IMPLEMENTADO** (por diseño).

### Deploy note

Aplicar migration `GastroProfileView` en el entorno antes de depender de series de vistas de local.
