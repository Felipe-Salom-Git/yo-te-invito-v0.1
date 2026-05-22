# Auditoría Gastro y Hoteles — V2 Producción

**Proyecto:** Yo Te Invito  
**Slices:** 1 (auditoría) · 2–8 (implementación) · **9 (cierre QA, 2026-05-22)**  
**Fuentes:** `docs/context/*`, `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` § Gastro y Hoteles, `docs/guides/SMOKE_TESTS_GUIDE.md`, código en `apps/api`, `apps/web`, `apps/scanner`, `packages/shared`

---

## Resumen ejecutivo (estado final V2)

| Vertical | Decisión V2 | Estado al cierre Slice 9 |
|----------|-------------|---------------------------|
| **Gastro** | **Parcial — entra** | Slices 2–7 cerrados: contenido Prisma, ficha pública, QR v1, scanner API + PWA, dashboard/validaciones, reviews/follows/alertas. QA scripts: `test:gastro-discount-qr` OK, `test:gastro-discount-scan` OK (API + `DEV_AUTH` o dev). Pendiente post-V2: storage imágenes, `smoke:gastro-discounts` npm unificado, deuda flujo legacy discounts. |
| **Hoteles** | **Próximamente** | Slice 8: rutas `/hoteles`, `/hoteles/[id]`, `/hotel`, explore `?category=hotel`, subcategorías `comingSoon`. Sin reservas, gateway ni carrusel activo. |

**Checklist V2** § Gastro y Hoteles: ítems de alcance, gastro operativo y hoteles Próximamente **marcados [x]**; edición ficha hotel (`PATCH /hotel/me`) sigue **abierto** (post-V2).

---

## Slice 9 — QA y cierre (2026-05-22)

### QA funcional Gastro (revisión código + rutas)

| Área | Ruta / flujo | Resultado |
|------|----------------|-----------|
| Discovery | `/categoria/gastro`, `/explore?category=gastro` | OK — en `EXPLORE_CATEGORY_OPTIONS`; landings sin hotel |
| Ficha pública | `/restaurants/[id]` | OK — `GastroPublicDetailContent`; sin ticketera |
| Portal | `/gastro`, `/gastro/contenido`, `/gastro/descuentos`, `/gastro/validaciones`, `/gastro/valoraciones` | OK — páginas presentes; datos vía repos |
| Follows | `GastroFollowButton`, `/me/gastro-follows` | OK — Slice 7; doc `GASTRO_FOLLOWS_NOTIFICATIONS.md` |
| QR / scanner | payload v1 + `POST /scanner/gastro-discounts/validate` | OK — scripts automatizados (ver abajo) |
| Reviews | público + `POST /gastro/reviews/:id/reply` | OK — `ManagedReviewsCommentsPage` scope `gastro` |

### QA funcional Hoteles

| Verificación | Resultado |
|--------------|-----------|
| `/categorias` sin hotel en grilla 2×2 | OK — `categoryGatewayConfig` |
| `/home` hotel no vertical activa | OK — `HomeHotelsComingSoon`; rails sin hotel |
| `/admin/categorias` tab Hotel | OK — `AdminHotelComingSoonPanel` |
| `/hoteles`, `/hoteles/[id]`, `/hotel` | OK — Slice 8; sin CTAs reserva |
| `/hotel/valoraciones` | OK — managed reviews scope `hotel` |

### QA técnico ejecutado

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api run test:gastro-discount-qr` | **PASS** (8 checks payload) |
| `pnpm --filter api run test:gastro-discount-scan` | **PASS** tras fix idempotencia script (limpieza validaciones + upsert claim2) |
| `pnpm --filter api run smoke:api` | **No ejecutado** — faltan `SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD` en entorno del agente |
| `pnpm --filter api run smoke:reviews` | **No ejecutado** — mismas credenciales |
| `pnpm --filter api run smoke:notifications` | **No ejecutado** — mismas credenciales + rol ADMIN para seed-demo |
| `pnpm e2e` | **Parcial** — 5 passed, 14 skipped (sin `E2E_*`), 4 failed (notificaciones/home con API — requieren credenciales) |

**Fix menor QA (Slice 9):** `publicSubcategoriesQuerySchema.category` acepta `hotel` + `comingSoon` en respuesta pública; script `test-gastro-discount-scan` idempotente.

**Manual pendiente (operador):** recorrer rutas con `pnpm run -w dev` y credenciales reales; correr smokes con `SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD` (ver `SMOKE_TESTS_GUIDE.md`).

---

## Decisión recomendada

### Gastro V2 → **Entra con alcance parcial**

Incluir en V2 **solo** lo ya estable y establecer explícitamente **fuera de V2**:

| Dentro de V2 (cerrado Slices 2–7 + QA 9) | Fuera de V2 (post-cierre) |
|------------------------------------------|---------------------------|
| Discovery, ficha `/restaurants/[id]`, portal, admin gastronómicos | Storage real de imágenes (salir de data-URL) |
| `GastroContent` Prisma + `/gastro/contenido` + ficha pública | `smoke:gastro-discounts` npm unificado (hoy `test:gastro-discount-*`) |
| QR v1 + scanner API + PWA door + dashboard/validaciones | Unificar flujo legacy `events/:id/discounts` vs portal discounts |
| Reviews V2, follows, alertas `FOLLOWED_GASTRO_NEW_DISCOUNT` | E2E dedicado gastro (no hay spec Playwright aún) |

**Riesgo si se declara “entra completo” sin slices 2–3:** marketing de cupones QR y página “Contenido” del portal muestran capacidades que no persisten ni validan en puerta.

### Hoteles V2 → **Próximamente**

Mantener la decisión ya implementada en UI/API:

- Discovery principal sin hotel (`categoryGatewayConfig`, `homeDiscoveryConfig`, `HomeHotelsComingSoon`).
- Admin: `AdminHotelComingSoonPanel`, `SubcategoriesService` devuelve `comingSoon: true` para `category=hotel` (admin y **público** `GET /subcategories/public?category=hotel`).
- Rutas: `/hoteles` (`HotelsComingSoonScreen`), `/hoteles/[id]` (`HotelPublicDetailContent` — sin WhatsApp ni ticketera), `/hotel` portal copy honesto, explore `?category=hotel` → banner Próximamente (Slice 8, 2026-05-22).
- No abrir subcategorías ni carrusel hotel en home hasta slice de producto dedicado.

Detalle técnico de hotel (reviews, apply, ficha legacy) queda documentado en § Hoteles para no perder inventario.

---

# Parte A — Gastro

## A.1 Modelo de datos (Prisma)

| Pieza | Archivo | Estado | Evidencia |
|-------|---------|--------|-----------|
| Perfil local | `apps/api/prisma/schema.prisma` — `GastroProfile` | **listo** | Campos completos: `displayName`, galería JSON, horarios, `subcategoryId`, `publicEventId`, `status` |
| Membresía | `UserGastroMembership` | **listo** | Vincula usuario ↔ perfil |
| Descuentos | `GastroDiscount`, `GastroDiscountValidation`, `GastroDiscountClaim` | **listo** | Estados `PENDING_REVIEW` … `ACTIVE`, `qrToken`, inbox `sourceInboxItemId` |
| Contenido editorial | `GastroContent` | **listo** (Slice 2, 2026-05-22) | `GET/POST /gastro/events/:eventId/content`, `PATCH /gastro/content/:id`; estados draft/published/inactive; público en ficha vía `content[]` |

```84:94:apps/api/src/modules/gastro/gastro.service.ts
  async listContent(_eventId: string) {
    return [];
  }

  async createContent(_eventId: string, _input: unknown) {
    return { id: 'stub', eventId: _eventId };
  }
```

## A.2 API — Portal dueño (`/gastro`)

| Endpoint | Archivo | Estado |
|----------|---------|--------|
| `GET/POST/PATCH /gastro/local` | `gastro-local.service.ts`, `gastro.controller.ts` | **listo** — Prisma; `syncPublicEvent` crea/actualiza `Event` categoría `gastro` |
| `GET/POST/PATCH /gastro/discounts` (portal tickets) | `gastro-portal-discounts.service.ts` | **listo** |
| `GET/POST/PATCH /gastro/events/:eventId/discounts` (legacy por evento) | `gastro.service.ts` | **parcial** — convive con flujo portal; mismo modelo `GastroDiscount` |
| `GET/POST /gastro/validations` | `gastro.service.ts` | **parcial** — registro manual POST; no escaneo QR |
| `GET/POST/PATCH /gastro/events/:eventId/content` | `gastro-content.service.ts` | **listo** |
| `GET /gastro/reviews*`, `POST /gastro/reviews/:id/reply` | `gastro-reviews.controller.ts` | **listo** — Reviews V2 |

## A.3 API — Público

| Endpoint | Archivo | Estado |
|----------|---------|--------|
| `GET /public/gastro-locations`, `by-event/:eventId`, `:id`, `:id/discounts` | `public-gastro-locations.controller.ts` | **listo** |
| `GET/POST /public/gastro-discounts/*` (list, claim, claims view) | `public-gastro-discounts.controller.ts` | **listo** |
| `GET /public/events` con `category=gastro`, teasers promo en listado | `public-events.service.ts` | **listo** |
| Payload QR v1 + scanner | `gastro-discount-qr.ts`, `POST /scanner/gastro-discounts/validate`, `apps/scanner` | **listo** (Slice 4–5) — ver `docs/gastro/GASTRO_DISCOUNT_QR.md` |

## A.4 API — Admin

| Endpoint | Ruta web admin | Estado |
|----------|----------------|--------|
| `GET /admin/gastronomicos`, `/:profileId`, descuentos | `/admin/gastronomicos` | **listo** |
| `GET/PATCH/POST … /admin/gastro-discount-tickets/:id/*` | `…/descuentos/[discountId]` | **listo** — aprobar, rechazar, publicación, email QR |
| `GET/POST /admin/profiles/gastro/pending`, approve | Registro `/register/gastro` | **listo** |
| Subcategorías `gastro` | `/admin/categorias` tab Gastronomía | **listo** |

## A.5 API — Usuario (`/me`)

| Pieza | Estado | Evidencia |
|-------|--------|-----------|
| `GET/POST/DELETE/PATCH /me/gastro-follows*` | **listo** | `me-gastro-follows.controller.ts`, `UserGastroFollow` |
| `POST /me/inbox/gastro-promotion` | **listo** | Solicitud promoción → inbox `GASTRO_PROMOTION_REQUEST` |

## A.6 Frontend — Público y discovery

| Ruta / componente | Estado | Notas |
|-------------------|--------|-------|
| `/restaurants/[id]` | **listo** (Slice 3) | `GastroPublicDetailContent` — hero, about, descuentos (empty), editorial, galería, contacto, reviews V2, follow; sin ticketera; `/events/:id` gastro → redirect |
| `/gastronomicos/[id]` | **listo** | Misma vista por `locationId` |
| `/categoria/gastro` | **listo** | `CategoryLandingPage`, rail descuentos `GastroDiscountsRail` |
| Home / explore / gateway | **listo** | 4 categorías activas; gastro en carruseles y filtros |
| `ContentCard` promo | **listo** | `gastroPromoLabel`, `gastroPromoImageUrl` desde API |

## A.7 Frontend — Portal `/gastro`

| Ruta | Estado | Notas |
|------|--------|-------|
| `/gastro` | **listo** | Dashboard métricas + alertas reviews |
| `/gastro/local`, `/gastro/local/editar` | **listo** | `GastroLocalForm` → API local |
| `/gastro/descuentos`, `/gastro/descuentos/nuevo` | **listo** | Tickets descuento portal |
| `/gastro/valoraciones` | **listo** | `ManagedReviewsCommentsPage` scope `gastro` |
| `/gastro/validaciones` | **parcial** | Solo listado usos vía `POST /gastro/validations` manual |
| `/gastro/contenido` | **listo** | API Prisma + estados; subida imagen data-URL (storage S3 pendiente) |
| Link “PWA Scanner” → `/dev/scanner-sim` | **riesgo** | Simulador valida **tickets** `yti:v1`, no descuentos gastro |

## A.8 Scanner

| Pieza | Estado | Evidencia |
|-------|--------|-----------|
| `apps/scanner` — `POST /scanner/validate` | **listo** (solo tickets) | `scanner.service.ts` — tickets `yti:v1` |
| Validación `yti:gastro-discount` | **faltante** | `CONTEXT_PENDIENTES.md` § D; sin matches en `apps/scanner` |
| `/dev/scanner-sim` | **parcial** | `apps/web/app/(public)/dev/scanner-sim/page.tsx` — `repos.scanner.scan` |

## A.9 Scripts y QA (referencia — no ejecutados en este slice)

| Comando | Uso gastro |
|---------|------------|
| `pnpm --filter api run smoke:api` | Health + auth; no cubre descuentos gastro |
| `pnpm --filter api run smoke:reviews` | Opcional `SMOKE_GASTRO_EMAIL` — réplicas `/gastro/reviews` |
| `pnpm e2e` | Sin specs gastro/hotel dedicados (solo login redirect acepta `/gastro`) |
| `pnpm --filter api run debug:gastro-discounts` | **Manual** — listado discounts/profiles en BD |
| `pnpm --filter api run debug:admin-api -- --profile-id <id>` | **Manual** — depuración API admin gastro |

**QA manual sugerido (post-slices):**

1. Crear/editar local en `/gastro/local` → verificar ficha `/restaurants/{publicEventId}`.
2. Crear ticket descuento → flujo admin aprobar → claim en ficha pública → email QR si está configurado.
3. `debug:gastro-discounts` tras operaciones para detectar `gastroProfileId` / `eventId` desalineados.
4. Reviews: `smoke:reviews` con `SMOKE_GASTRO_EMAIL`.

---

# Parte B — Hoteles

## B.1 Modelo de datos (Prisma)

| Pieza | Archivo | Estado |
|-------|---------|--------|
| `HotelProfile` | `schema.prisma` | **listo** (modelo) — **parcial** (producto): sin `publicEventId` ni paridad con gastro |
| `UserHotelMembership` | `schema.prisma` | **listo** |

## B.2 API

| Endpoint | Archivo | Estado |
|----------|---------|--------|
| `GET /hotel/me` | `hotel.controller.ts`, `hotel.service.ts` | **listo** — solo lectura subset de campos |
| `PATCH /hotel/me` o edición ficha | — | **faltante** |
| `POST /profiles/hotel/apply` | `profiles.controller.ts` | **listo** |
| `GET/POST /admin/profiles/hotel/pending`, approve | `admin.controller.ts` | **listo** |
| `GET /hotel/reviews*`, `POST /hotel/reviews/:id/reply` | `hotel-reviews.controller.ts` | **listo** |
| Subcategorías `category=hotel` | `subcategories.service.ts` | **Próximamente** — admin y `listPublic` → `{ data: [], comingSoon: true }`; create/update → 403 |

## B.3 Frontend — Discovery y admin

| Pieza | Estado | Evidencia |
|-------|--------|-----------|
| Gateway / home / explore | **Próximamente** | Sin tile hotel; `HomeHotelsComingSoon.tsx`; explore `?category=hotel` → banner |
| `/hoteles` | **listo** (V2) | `HotelsComingSoonScreen` — pantalla dedicada Próximamente |
| `/hoteles/[id]` | **listo** (Slice 11) | `HotelLocationDetailView` + `GET /public/hotel-locations/by-event/:eventId`; hero, galería, ubicación, contacto real, amenities, reviews; sin booking |
| Admin dashboard vertical Hoteles | **Próximamente** | `AdminVerticalStatusCard` `comingSoon` en `AdminDashboardClient.tsx` |
| `/admin/categorias` tab Hoteles | **Próximamente** | `AdminHotelComingSoonPanel.tsx` |

## B.4 Frontend — Portal `/hotel`

| Ruta | Estado | Notas |
|------|--------|-------|
| `/hotel`, `/hotel/editar` | **listo** (Slice 10) | Hub + completitud + preview; formulario editable; discovery público sigue Próximamente |
| `/hotel/valoraciones` | **listo** | Reviews V2 managed scope `hotel` |
| Registro `/register/hotel` | **listo** | Apply + success |

## B.5 Checklist y pendientes documentados

| Ítem | Fuente | Estado |
|------|--------|--------|
| Usuario hotel de prueba manual | `CONTEXT_PENDIENTES.md` § C | Abierto |
| Edición ficha `/hotel` | Checklist V2 + portal copy | **faltante** |
| E2E mínimo hotel (portal, ficha, gateway) | `e2e/hotel.spec.ts`, `HOTEL_E2E.md` | **listo** (Slice 12) |
| E2E apply → admin → carrusel hotel | `CONTEXT_PENDIENTES.md` § C | **faltante** — fuera V2; discovery sin carrusel hotel |

---

# Riesgos transversales (ambas verticales)

| Riesgo | Severidad | Detalle |
|--------|-----------|---------|
| Imágenes data-URL | **riesgo** | Portal gastro contenido y formularios locales; checklist § Storage sin cerrar |
| Dos flujos de descuento gastro | **riesgo** | Portal `POST /gastro/discounts` vs legacy `POST /gastro/events/:eventId/discounts` |
| QR gastro sin scanner | ~~riesgo~~ **cerrado Slice 5/9** | `test:gastro-discount-scan` + PWA `apps/scanner/app/door` |
| Hotel en BD pero no en discovery | **bajo** | Eventos `category=hotel` pueden existir; UX dice Próximamente — evitar publicar hasta slice hotel |

---

# Próximos slices sugeridos (pequeños)

## Gastro

| # | Slice | Alcance | Archivos / comandos tocados (orientativo) |
|---|-------|---------|-------------------------------------------|
| ~~G1~~ | **Scanner QR descuentos** | **Cerrado Slice 5** | `ScannerGastroDiscountService`, `apps/scanner/app/door` |
| ~~G2~~ | **Contenido editorial Prisma** | **Cerrado Slice 2** | `GastroContent`, `gastro-content.service.ts`, `packages/shared/schemas/gastro-content.ts` |
| ~~G3~~ | **Ficha pública restaurante** | **Cerrado Slice 3** | `GastroPublicDetailContent`, hooks `gastro-public-detail.ts`, redirect gastro en `/events/[id]` |
| ~~G4~~ | **QR descuentos v1** | **Cerrado Slice 4** | `docs/gastro/GASTRO_DISCOUNT_QR.md`, `test:gastro-discount-qr` |
| ~~G1b~~ | **Validación puerta** | **Cerrado Slice 5** | `test:gastro-discount-scan` |
| ~~G5~~ | **Dashboard + resumen descuentos** | **Cerrado Slice 6** | `GET /gastro/dashboard`, `/gastro/validaciones` |
| ~~G6~~ | **Reviews + follows + alertas** | **Cerrado Slice 7** | `ManagedReviewsCommentsPage`, `FOLLOWED_GASTRO_NEW_DISCOUNT`, `GASTRO_FOLLOWS_NOTIFICATIONS.md` |
| G3 | **Smoke `smoke:gastro-discounts`** | Claim + approve + validación QR (si G1 listo) | `apps/api/scripts/`, `SMOKE_TESTS_GUIDE.md` |
| G4 | **Pulido portal contenido** | Redirigir o fusionar `/gastro/contenido` con campos de `GastroProfile` / galería del local | `apps/web/app/(portal)/gastro/contenido` |
| G5 | **Checklist + contexto** | Marcar ítems cerrados en `Yo_Te_Invito_Checklist_V2_Produccion.md` y `CONTEXT_PENDIENTES.md` § D | Solo docs al cerrar slices |

## Hoteles

| # | Slice | Alcance |
|---|-------|---------|
| H1 | **Decisión producto (doc)** | Confirmar Próximamente en V2 — sin código salvo copy ya existente |
| ~~H2~~ | **Edición ficha hotel** | **Cerrado Slice 10** — `PATCH /hotel/me`, `/hotel/editar`, `HotelProfileForm` |
| H3 | **Subcategorías + discovery** | Habilitar `category=hotel` en `SubcategoriesService` + tile gateway + carrusel (slice grande; después de H2) |
| ~~H4~~ | **E2E hotel mínimo** | **Cerrado Slice 12** — `e2e/hotel.spec.ts`, `pnpm e2e:hotel`, `docs/hotel/HOTEL_E2E.md` (skip sin `E2E_HOTEL_*`) |
| H5 | **E2E apply → carrusel** | Fuera V2; requiere H3 discovery |

**Orden recomendado:** G1 → G3 (si gastro parcial debe “cerrar” cupones) → G2 → G4; Hoteles: H1 ahora (solo decisión), H2–H4 post-V2.

---

# Verificación manual y comandos

Slice 9 ejecutó scripts gastro (tabla arriba). Para cierre operativo completo, correr además:

```bash
# Infra
pnpm db:up && pnpm db:migrate
pnpm run -w dev

# Smokes generales (credenciales obligatorias)
SMOKE_USER_EMAIL=<email> SMOKE_USER_PASSWORD=<pass> pnpm --filter api run smoke:api
SMOKE_USER_EMAIL=<email> SMOKE_USER_PASSWORD=<pass> pnpm --filter api run smoke:reviews
# Opcional gastro en reviews:
# SMOKE_GASTRO_EMAIL=... SMOKE_GASTRO_PASSWORD=...

# E2E web (cuando existan specs gastro)
E2E_USER_EMAIL=<email> E2E_USER_PASSWORD=<pass> pnpm e2e

# Scripts específicos gastro (hoy — manual)
pnpm --filter api run debug:gastro-discounts
pnpm --filter api run debug:admin-api -- --profile-id <gastroProfileId>
```

**Hoteles:**

```bash
# Sin credenciales (2 tests públicos; resto skip)
pnpm e2e:hotel

# Con usuario hotel ACTIVE + ubicación guardada
E2E_HOTEL_EMAIL=<email> E2E_HOTEL_PASSWORD=<pass> pnpm e2e:hotel

# Tab admin Hoteles (opcional)
E2E_ADMIN_EMAIL=<admin> E2E_ADMIN_PASSWORD=<pass> pnpm e2e:hotel
```

Doc: `docs/hotel/HOTEL_E2E.md`. Smoke API hotel sigue manual vía `GET /hotel/me`.

---

# Referencias

- Checklist: `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` § Gastro y Hoteles
- Pendientes: `docs/context/CONTEXT_PENDIENTES.md` § C (hotel), § D (gastro)
- Backend: `docs/context/BACKEND_CONTEXT.md` — módulos Gastro/Hotel
- Frontend: `docs/context/FRONTEND_CONTEXT.md` — rutas y portales
- Reviews: `docs/reviews/REVIEWS_V2.md`
- Smokes: `docs/guides/SMOKE_TESTS_GUIDE.md`, `docs/dev/SCRIPTS.md`
- Discovery (contexto gastro en home): `docs/audits/PUBLIC_DISCOVERY_AUDIT.md`

---

*Slice 1: auditoría inicial. Slices 2–8: implementación. Slice 9: QA y cierre checklist (2026-05-22). Slice 12: E2E hotel mínimo (2026-05-22).*
