# V3.3 — G12.1 QR loading UX, ficha mobile, denunciar valoraciones y vistas por local (closing)

**Fecha:** 2026-11-02 · **Rama:** `feat/v1-s03-api-foundation` · **Estado:** **G12.1 COMPLETE en código**, local,
**sin push / sin deploy**. Base: G10 + G11.1 + G11.2 (desplegados según el operador).

**HEAD inicial:** `f9938d5` · **Migrations nuevas:** **1** (aditiva, aprobada por el operador antes de crearla):
`20261102150000_review_dispute_gastro_scope` — aplicada **solo en local**.

## Commits

| Slice | Commit | Cambio |
|-------|--------|--------|
| 12.1-A | `f004f47` | `QrPreparingOverlay` reusable (cara de Yo Te Invito girando, «Creando tu QR…» → «Preparando el envío…») en todos los flujos web que generan / envían QR |
| 12.1-B | `8e58196` | Modales públicos: en mobile arrancan debajo del navbar + safe area y crecen hacia abajo (`public-modal-viewport` / `public-modal-panel`) |
| 12.1-C | `dff5c4a` | «Denunciar» valoración recuperado para locales gastro (mismo dominio `ReviewDisputeRequest` + cola `/admin/review-disputes`) + migration aditiva |
| 12.1-D | `797299f` | Visualizaciones por local en `/gastro/local` (`viewCount` aditivo en `GET /gastro/locations`) |
| 12.1-E | (este commit) | Cierre, regresión y handoff |

## 12.1-A — Feedback al generar / enviar QR

- No existía overlay reusable (solo `PageLoader` inline y `Modal`). Nuevo `components/ux/QrPreparingOverlay.tsx`
  + lógica `lib/ux/qrPreparing.ts`. Doc: [`docs/components/qr-preparing-overlay.md`](../components/qr-preparing-overlay.md).
- Portal a `body`, `z-[90]` (cubre página y diálogos → sin doble submit; botones siguen `disabled`),
  `role="status"` + `aria-live="polite"` + `aria-busy`, `motion-reduce` → pulse.
- Aparece con `isPending`; en flujos con envío cambia a «Preparando el envío…» a los 1,5 s. SUCCESS: el toast /
  resultado existente es el feedback (no se agregó toast). ERROR: error existente; la mutación sale de `pending`
  → el overlay nunca queda bloqueado. Claims públicos (redirigen al QR) mantienen el overlay hasta el cambio de ruta.
- Flujos: claim descuento gastro, claim cupón de actividad, solicitud de cortesía (portal), cortesía financiada
  (admin), admin «Enviar QR por mail» / «Reintentar entrega» / aprobar cortesía, cortesías de productora
  (entradas con QR), guardar diseño en QR Studio.

## 12.1-B — Ficha mobile larga / navbar

- **Causa:** todos los modales públicos usaban `fixed inset-0 flex items-center` + panel `max-h-[min(90vh,100dvh)]`.
  Un panel alto centrado en flex desborda **hacia arriba** (título / cerrar / compartir fuera de pantalla, bajo el
  navbar) y no se puede scrollear de vuelta.
- **Fix:** `--public-navbar-height` (3.5 / 4 / 4.5rem, igual que `Navbar`) + clases `public-modal-viewport`
  (mobile: `align-items: flex-start`, `padding-top = safe-area + navbar + 0.5rem`, scroll propio; sm+: centrado) y
  `public-modal-panel` (`max-height` desde `100dvh` − navbar − safe areas; nunca depende del contenido).
  Contenido largo scrollea **dentro** del panel. Body lock sin cambios. Doc:
  [`docs/components/public-modal-layout.md`](../components/public-modal-layout.md).
- Superficies: `ContentPreviewModal` (modal minimizado de gastro / eventos / actividades / rentals / hoteles),
  `ui/Modal` (incluye «Ver ficha» del portal), `PublicDescriptionBlock` («Ver más» de fichas y publicaciones),
  `EventLocationModal`, `EventCalendarModal`, `ProducerRatingDistributionModal`. Las **páginas** de detalle ya
  arrancaban bajo el navbar sticky (sin cambios). Descuentos / publicaciones / productoras no tienen modal propio.
- **QA visual (página temporal con el modal real + mock, no commiteada), 390×664:** panel en `top=64px`
  (navbar 56 + 8), `max-height 588px`, expandido con «Ver similares» (1448px de contenido) scrollea adentro;
  título y «Compartir» visibles. Desktop 1280×800: centrado (`top=40`, 90vh).

## 12.1-C — Denunciar valoración

- **Auditoría:** nunca existió «Denunciar» en la ficha pública. El flujo era «Solicitar revisión»
  (`ReviewDisputeModal` → `POST /producer/reviews/:id/dispute` → `/admin/review-disputes`), habilitado solo con
  `allowDisputes={scope === 'producer'}`. Al pasar las valoraciones gastro a **por local** (G7.10.5 / G7.11) quedó
  «Responder» sin denuncia. `ReviewDisputeRequest.producerProfileId` era obligatorio y el `Event` público de un
  local gastro no tiene productora → **no se podía reutilizar sin migration** (STOP + aprobación del operador).
- **Migration (aditiva):** `producerProfileId` nullable (filas existentes intactas), `gastroProfileId` nullable +
  FK `GastroProfile` (`ON DELETE CASCADE`) + índice `(tenantId, gastroProfileId)` + CHECK **exactamente un owner**.
- **API:** `POST /gastro/reviews/:reviewId/dispute` (Zod `createReviewDisputeSchema`, `GastroRolesGuard`).
  `GastroReviewDisputesService`: review gastro → local por `publicEventId` → `canManageGastroPublicEvent`
  (membership ACTIVE del local o ADMIN) → duplicado abierto 409 → `createDisputeRecord` (helper compartido con
  productora: review `IN_REVIEW` + inbox ADMIN + disputa `PENDING`) → notificación existente. Listado gastro
  devuelve `dispute` por review. Admin list/detail null-safe + búsqueda por nombre de local.
- **Permisos:** owner del local ✔ · ADMIN ✔ · owner de **otro** local ✘ (403) · autor de la review / otros
  usuarios ✘ (403; sin acción en ficha pública, igual que el modelo anterior). Hotel sigue sin disputas.
- **Sin cambios:** rating, ownership de review, réplica, semántica de moderación (accept → HIDDEN + recompute;
  reject → REPORT_REJECTED).
- **UI:** «Responder» + **«Denunciar»** (label unificado también en productora) en `/gastro/valoraciones` (local
  activo); modal «Denunciar valoración» con motivo + detalle (mín. 10). Admin: «Productora / local».
  `ProducerReviewCard.tsx` (código muerto desde `d8da1b7`) eliminado.
- **DB (Postgres local, tx con rollback):** fila gastro creada, include admin resuelve el local, review
  `IN_REVIEW`, CHECK rechaza disputa sin owner. **HTTP (API local, dev auth):** body inválido 400, review
  inexistente 404, sin auth 401, `GET /admin/review-disputes` 200.

## 12.1-D — Visualizaciones por local

- `GET /gastro/locations` no traía vistas. Extensión **aditiva**: `viewCount` en `gastroLocationSummarySchema`.
- Fuente: filas `GastroProfileView` del local (misma que `totalViews` del dashboard), **un** `groupBy` para todos
  los locales gestionados (sin N+1). No usa la columna espejo, ni vistas de descuentos / publicaciones, ni suma
  de cuenta. UI: «👁 1.245 visualizaciones» junto al estado. Doc:
  [`docs/components/gastro-locations-list.md`](../components/gastro-locations-list.md).

## Regresión

| Check | Resultado |
|-------|-----------|
| Nuevos: `test:qr-preparing-overlay`, `test:public-modal-top-offset`, `test:gastro-review-report`, `test:gastro-local-view-count` | PASS |
| G11 share/modal: `test:public-share`, `test:gastro-location-share`, `test:public-gallery-swipe`, `test:rating-face-icons`, `test:web-qr-short-code`, `test:home-covers`, `test:gastro-scanners-grouped`, `test:gastro-discount-benefit-label` | PASS |
| Reviews: `test-g710-gastro-reviews-profile-scope`, `managed-reviews-url.assert` (web), producer mapping en `test:gastro-review-report` | PASS |
| Gastro multi-local / métricas: `test:gastro-multi-local`, `test:gastro-profile-view-scope`, `test:gastro-profile-metrics-days`, `test:gastro-empty-states`, `test:gastro-card-chips` | PASS |
| QR / cortesía / Studio: `test:gastro-discount-qr`, `test:activity-coupon-qr`, `test:scanner-manual-short-code`, `test:gastro-short-code-retry`, `test:gastro-courtesy-{studio,portal,delivery,approval,lifecycle,emails}`, `test:admin-gastro-courtesy`, `test:discount-visual-{template,render}`, `test:gastro-discount-visual-persist` | PASS |
| `pnpm --filter shared/api/web/scanner run build` | PASS (los 4) |
| Web `tsc` suelto | Solo el PREEXISTING `vitest` |
| `smoke:reviews` (HTTP + credenciales) | NO EJECUTADO |

## Deploy (cuando el operador lo indique)

Orden: backup → pull → install → `pnpm --filter shared run build` **antes** de la API → `prisma generate` →
builds → **`npx prisma migrate deploy`** (aplica `20261102150000_review_dispute_gastro_scope`, aditiva, sin
backfill) → restart api/web. Rollback de código seguro: las filas producer siguen válidas; si ya existen
disputas gastro, un rollback de código no las lee (quedan en DB, sin pérdida).

## QA manual pendiente (post-deploy)

1. Celular: reclamar descuento / cupón → overlay con la cara girando → pantalla del QR; error (email inválido) →
   overlay se cierra y aparece el error. Portal: solicitar cortesía; admin: enviar QR, aprobar cortesía, reintentar.
2. Celular: abrir el modal minimizado de un local con mucho contenido, «Ver similares», «Ver más» de la
   descripción → título, cerrar y «Compartir» siempre visibles bajo el navbar; desktop centrado.
3. `/gastro/valoraciones` (local A) → «Denunciar» → motivo + detalle → toast; la review pasa a «en revisión»;
   aparece en `/admin/review-disputes` con «Local: A»; aceptar / rechazar; segunda denuncia abierta bloqueada;
   cambiar a local B no muestra la denuncia de A.
4. `/gastro/local` con varios locales → cada uno muestra sus propias visualizaciones (comparar con el dashboard
   de cada local).

## Riesgos / pendientes

- Duplicado de disputa: check a nivel aplicación (igual que productora), sin unique parcial en DB.
- Crear la disputa sigue ocultando la review del listado público (`IN_REVIEW`), aunque el modal dice que no cambia
  el puntaje — semántica previa, sin cambios.
- Portal confirm dialogs y `ImageGalleryLightbox` no usan las clases nuevas (fuera de alcance).
- `review-disputes.service.ts` sigue > 400 líneas (deuda previa; la lógica gastro va en servicio aparte).
