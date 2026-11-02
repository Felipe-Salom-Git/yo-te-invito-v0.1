# V3.3 — G12.2 Eventos publicitarios creados por locales gastro (closing)

**Fecha:** 2026-11-02 · **Rama:** `feat/v1-s03-api-foundation` · **Estado:** **G12.2 COMPLETE en código**, local,
**sin push / sin deploy**. Base: G12.1 (`2d37647`).

**HEAD inicial:** `2d37647` · **Migration nueva:** **1** (aditiva) `20261102170000_event_gastro_promo_owner` —
aplicada **solo en local**. Detalle técnico: [`docs/components/gastro-promo-events.md`](../components/gastro-promo-events.md).

## Commits

| Slice | Commit | Cambio |
|-------|--------|--------|
| 12.2-A | `272646a` | Modelo: `Event.gastroProfileId` (FK RESTRICT + índice + CHECK productora XOR local), guards productora / ticket types, borrados de local |
| 12.2-B | `bbc642a` | API `/gastro/promo-events*` + portal `/gastro/contenido` con pestañas **Publicaciones / Eventos** |
| 12.2-C | `8ac7571` | Discovery público (listas, búsqueda, detalle), organizador = local, CTA sin «Comprar entradas» |
| 12.2-D | `b1ba75e` | Bloque **Eventos** en `/gastronomicos/:id`, galería del evento (swipe), copy de imágenes del formulario |
| 12.2-E | (este commit) | Admin (origen / filtro / aprobar-rechazar / notificaciones), regresión, docs |

## 12.2-A — Discovery (respuestas)

1. **¿Event sin ProducerProfile?** Sí: `producerProfileId` es nullable y ya existían eventos sin productora
   (publicaciones generales de admin, page-event del local).
2. **Owner actual:** `producerProfileId` (memberships) con fallback legacy `producerId` (= userId, sin FK).
3. **Publicitario / sin ticketera:** `isGeneralPublication = true` + `isTicketingEnabled = false`
   (`eventMode PUBLICITY_ONLY`).
4. **Mínimo de la ficha:** `title`, `startAt`; opcionales portada, descripción, lugar, `EventMedia`, tags, subcategoría.
5. **Lifecycle:** `DRAFT` → `PENDING` (aviso ops) → ADMIN `APPROVED` (+ `publishedAt`) o rechazo (`CANCELLED`).
6. **¿Reutilizable sin romper productoras?** Sí, con una FK nullable. `GastroProfile.publicEventId` es 1:1
   (page-event del local) y no sirve para N eventos por local → **migration necesaria**.

**Decisión:** reutilizar `Event`; **sin** `GastroEvent`. `category = 'event'` (nunca `gastro`: la ficha
`/events/:id` redirige `gastro` al restaurante y los rails de Eventos filtran por `event`).

## Lifecycle y seguridad

- Crear (local seleccionado, `profileId` obligatorio) → `DRAFT` o directo `PENDING`; enviar a revisión
  exige local **ACTIVE**. ADMIN aprueba / rechaza con la moderación de eventos existente (endpoint genérico
  `reject` agregado). Rechazado se puede corregir y reenviar. Archivar = soft delete.
- Editar un evento `APPROVED` lo mantiene publicado (misma regla que productoras; sin re-revisión).
- Acceso = membership del **local del evento** (o ADMIN en el tenant); nunca solo `userId`.
- Productoras: `assertEventOwnedByUser` rechaza eventos gastro (no admin); ticket types rechazan eventos
  gastro (todos); listado `/producer/events` los excluye. Sin checkout posible (sin ticket types).
- Sin aceptación de términos de productora (no aplica a locales gastro).

## Regresión

| Check | Resultado |
|-------|-----------|
| Nuevos: `test:gastro-promo-event-ownership`, `test:gastro-promo-events`, `test:gastro-promo-event-admin` | PASS |
| **DB (PostgreSQL local, rollback):** `test:g12-gastro-promo-events-db` — rails / estados / aislamiento por local / búsqueda / detalle sin ticketing / CHECK / FK RESTRICT | PASS |
| **HTTP end-to-end (API compilada, dev auth, datos temporales borrados, 0 restos):** crear A (PENDING) · B propio (DRAFT) · local ajeno 403 · otro gastro 403 · Zod 400 · sin auth 401 · ticket types 403 · no público en PENDING · admin origen GASTRO · aprobar · listado local A / no en B · discovery · búsqueda · detalle sin ticketing + galería · sin ticket types públicos · enviar → rechazar con motivo → CANCELLED · notificación al portal gastro | 21/21 PASS |
| Eventos / público: `test:public-event-summary`, `test:event-trending`, `test:event-visibility`, `test:category-availability`, `test:ticket-template-schema`, `test:gastro-event-tags`, subcategorías gastro | PASS |
| G11 / G12.1: share, galería swipe, modal top offset, portadas, QR overlay, denuncias, vistas por local | PASS |
| Gastro: multi-local, vistas, contenido / galería, empty states, chips, QR, cortesías, Studio, scanner short code | PASS |
| `pnpm --filter shared/api/web/scanner run build` | PASS (los 4) |
| Web `tsc` suelto | Solo el PREEXISTING `vitest` |

**Total suites:** 36 PASS. **QA visual (página temporal con componentes reales + repos mock, no
commiteada), 390×844:** bloque Eventos solo con eventos del local, orden por fecha, fecha + hora; tarjeta
«Evento informativo» con «Ver ficha del local»; galería abre el lightbox con swipe (`touch-pan-y`) y cierra
con Escape; pestaña Eventos con estados / acciones por estado; formulario sin campos de entradas, errores
inline.

**Producer regression:** sin suite CRUD productora sin credenciales; cubierto por ownership (acceso propio
y ticket types sin cambios), DB (eventos de productora siguen listados) y notificaciones (links productora sin
cambios). `smoke:*` HTTP con credenciales NO EJECUTADO.

## Deploy (cuando el operador lo indique)

`shared` build **antes** de la API → `prisma generate` → builds → **`npx prisma migrate deploy`** (aplica
G12.1 `20261102150000` + G12.2 `20261102170000`, ambas aditivas, sin backfill) → restart api / web.

## QA manual pendiente (post-deploy)

1. Portal gastro (local A y B de la misma cuenta): pestaña Eventos → crear con imágenes → enviar a revisión;
   guardar borrador; editar; archivar.
2. ADMIN `/admin/eventos?origin=gastro&view=pending`: Origen «Local gastronómico» · local · owner → aprobar /
   rechazar con motivo; dashboard «Revisar» lleva a esa vista; owner recibe la notificación con link al portal.
3. Público (rol con preview mientras Eventos sea «comingSoon»): evento en Recientes / subcategorías /
   calendario / `/explore` / búsqueda; ficha `/events/:id` sin compra, «Más información», «Ver ficha del local»,
   compartir, galería swipe en celular.
4. `/gastronomicos/:id`: bloque Eventos entre Descuentos y Publicaciones; solo eventos del local.
5. Productora: crear / editar evento con ticketera y publicidad, detalle público, rails — sin cambios.

## Riesgos / pendientes

- **«comingSoon»:** `event` y `gastro` siguen en `comingSoon` (V3.2). El público y los GASTRO_OWNER no ven el
  catálogo de Eventos ni `/events/:id` hasta que el operador lo habilite; el owner ve sus eventos en el portal.
  Decisión del operador (no se cambió la disponibilidad de categorías).
- Los rails «Destacados» y «Próximos» de Eventos son solo con ticketera (regla previa para publicidad).
- El motivo de rechazo queda en auditoría + notificación (no en el evento; igual que productoras).
- Preexistente fuera de alcance: `eventUpdateDtoSchema` de productora permite `status: 'APPROVED'`;
  «Imágenes del ticket» en el uploader de publicaciones (el formulario de eventos ya usa su propio copy).
