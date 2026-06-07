# Auditoría Admin Gastro Locations — Yo Te Invito

**Fecha:** 2026-06-02  
**Slice:** Admin Gastro 1 (auditoría) · **Admin Gastro 2 (backend CRUD — 2026-06-02)**  
**Estado:** Slices 2–5 cerrados (2026-06-02) — bloque Admin Gastro Locations operativo  
**Hotfix 2026-06-14:** sync discovery público reforzado — ver `V3_1_HOTFIX_ADMIN_GASTRO_DISCOVERY_SMOKE.md`  
**Ramas revisadas:** `main`, `feat/v1-s03-api-foundation` (sin cambios de `developer`)  
**Fuentes:** `docs/context/*`, `docs/rules/PROJECT_RULES.md`, `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`, código en `apps/api`, `apps/web`, `packages/shared`

---

## Slice 2 — Backend CRUD (cerrado 2026-06-02)

### Implementado

| Pieza | Archivo |
|-------|---------|
| Sync compartido | `apps/api/src/modules/gastro/gastro-public-event-sync.service.ts` |
| Campos compartidos | `apps/api/src/modules/gastro/gastro-profile-fields.util.ts` |
| Admin write service | `apps/api/src/modules/admin/admin-gastro-locations.service.ts` |
| Schemas Zod | `packages/shared/src/schemas/admin-gastro.ts` — `adminGastroLocationCreateSchema`, `Update`, `StatusPatch` |
| Portal refactor | `gastro-local.service.ts` usa sync compartido (sin duplicar lógica) |

### Endpoints nuevos (ADMIN)

| Método | Ruta | Body |
|--------|------|------|
| POST | `/admin/gastronomicos` | `adminGastroLocationCreateSchema` |
| PATCH | `/admin/gastronomicos/:profileId` | `adminGastroLocationUpdateSchema` |
| PATCH | `/admin/gastronomicos/:profileId/status` | `{ status: DRAFT\|PENDING\|ACTIVE\|REJECTED\|SUSPENDED }` |

**Reglas:** `GastroProfile` sin hard-delete; `publicEventId` preservado al suspender; evento vinculado pasa a `PAUSED` (discovery) mientras perfil ≠ `ACTIVE`; owner opcional vía `ownerUserId` → `UserGastroMembership` idempotente.

**Nota campos:** `GastroProfile` no tiene `whatsappPhone` ni Instagram; teléfono → `contactPhone`, web → `websiteUrl`, carta → `menuUrl`.

### Smoke manual / API sugerido

```bash
# 1. Login admin (JWT o DEV_AUTH)
# 2. Crear local
curl -X POST http://localhost:3001/admin/gastronomicos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"displayName":"Test Admin Local","contactEmail":"local@test.com","location":{"province":"Río Negro","city":"San Carlos de Bariloche","address":"Av. Test 123"},"publish":true}'

# 3. Verificar público (tenant-demo)
curl "http://localhost:3001/public/gastro-locations?tenantId=tenant-demo"

# 4. Editar
curl -X PATCH http://localhost:3001/admin/gastronomicos/$PROFILE_ID \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"displayName":"Test Admin Local Editado"}'

# 5. Suspender
curl -X PATCH http://localhost:3001/admin/gastronomicos/$PROFILE_ID/status \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"SUSPENDED"}'

# 6. Confirmar: no aparece en GET /public/gastro-locations; publicEventId intacto; descuentos/follows no borrados
```

---

## Slice 3 — Listado admin UI (cerrado 2026-06-02)

### Implementado

| Pieza | Ruta / archivo |
|-------|----------------|
| Página listado | `/admin/gastronomicos` → `AdminGastroLocationsPageClient` |
| Filtros URL | `lib/admin/admin-gastro-filters.ts`, `useAdminGastroUrlFilters.ts` |
| Query hooks | `lib/query/admin-gastro.ts` — `useAdminGastroLocationsList`, `useAdminGastroLocationStatusMutation` |
| UI | `components/admin/gastro/AdminGastroLocationsFilters`, `Table`, `MobileCard` |
| Repo | `adminGastro.updateLocationStatus` en `ApiRepository` |
| Placeholder Slice 4 | `/admin/gastronomicos/nuevo`, `…/[profileId]/editar` |
| Nav admin | `portalNavConfig` — «Locales gastronómicos» |

### Filtros

| Filtro | Origen |
|--------|--------|
| Búsqueda, estado, descuentos pendientes | API `GET /admin/gastronomicos` |
| Dueño, ficha pública, ciudad | Cliente (misma página, hasta 100 ítems) |

### Acciones en listado

- Ver detalle → `/admin/gastronomicos/[profileId]`
- Editar → `/admin/gastronomicos/[profileId]/editar` (placeholder)
- Ver ficha pública → `/gastronomicos/[profileId]` si `status=active` y `publicEventId`
- Activar / Suspender → `PATCH …/status` con confirmación

---

## Slice 4 — Formularios crear/editar (cerrado 2026-06-02)

### Implementado

| Pieza | Detalle |
|-------|---------|
| Crear | `/admin/gastronomicos/nuevo` → `AdminGastroLocationFormClient` mode=create |
| Editar | `/admin/gastronomicos/[profileId]/editar` → mode=edit |
| Formulario | `GastroLocalForm` con `mode="admin"` (portal dueño sin cambios, default `owner`) |
| Admin extras | `legalName`, `ownerUserId`, `status`, `publish` (solo alta) |
| Mutations | `createLocation`, `updateLocation` en repo + `useAdminGastroLocationCreate/UpdateMutation` |
| Subcategorías | `useAdminSubcategories('gastro')` |
| GCS | `scope: 'gastro'` en editar; en crear URLs https hasta tener `profileId` (redirect a editar post-create) |
| GET detail ampliado | Campos de ficha para editar (gallery, horarios, geo, subcategoría) — respuesta backward-compatible |

### Flujo crear

1. Completar formulario + opciones admin.
2. `POST /admin/gastronomicos`.
3. Redirect a `/admin/gastronomicos/[id]/editar` para subir imágenes GCS.

### Flujo editar

1. `GET /admin/gastronomicos/:id` (detalle completo).
2. `PATCH /admin/gastronomicos/:id`.
3. Redirect a detalle admin.

---

## Slice 5 — QA smoke + ajuste fino (cerrado 2026-06-02)

### URL pública canónica (decisión documentada)

| Ruta | Parámetro `id` | Rol |
|------|----------------|-----|
| **`/gastronomicos/[id]`** | `GastroProfile.id` | **Canónica** — metadata `alternates.canonical`, Open Graph, JSON-LD (`gastronomicos/[id]/layout.tsx`) |
| **`/restaurants/[id]`** | `Event.id` (`publicEventId`) | **Alias discovery** — cards en home/explore vía `getContentDetailHref` → `/restaurants/{eventId}`; `robots: noindex`; canonical apunta a `/gastronomicos/[id]` (mismo id en URL = event id hasta dedupe SEO 6) |

**CTA admin «Ver ficha pública»:** `/gastronomicos/{profileId}` (no `/restaurants/`), solo si perfil **ACTIVE** y tiene `publicEventId`. Evita enlace roto en suspendidos (API público exige `status: ACTIVE`).

**Discovery:** `/categoria/gastro` y `/explore?category=gastro` listan **eventos** `category=gastro` con `status: APPROVED` (sync desde perfil ACTIVE). Ficha directa: `GastroLocationDetailView` resuelve por `locationId` o `eventId`.

### Validación estática (código — 2026-06-02)

| Área | Resultado |
|------|-----------|
| Sync público | `GastroPublicEventSyncService` — create/update/publicar → evento `gastro` + `subcategoryId`; suspender → `syncVisibilityForProfile` → evento `PAUSED`, **`publicEventId` preservado** |
| Create sin publicar | `publish: false` o `status !== ACTIVE` → no `syncPublicEvent` en alta |
| Listado público | `public-gastro-locations.service` — `ACTIVE` + `publicEventId` |
| GCS edición | `GastroLocalForm` — `uploadConfig: { scope: 'gastro', entityId: profileId }` en admin editar |
| Create imágenes | Sin `profileId` → solo URLs https; copy en formulario; redirect a editar post-`POST` |
| Portal dueño | `GastroLocalForm` default `mode="owner"`; sin bloque admin (`status`/`publish`/`ownerUserId`) |
| Permisos web | `admin/layout.tsx` — `ProfileProtectedLayout` `Role.ADMIN` |
| Permisos API | `@RequireRole(Role.ADMIN)` en `POST/PATCH/GET` admin gastronomicos |
| Builds | `pnpm --filter web run build` OK (Slice 5) |

### Ajustes menores aplicados (Slice 5)

- CTA «Ver ficha pública» en listado (tabla + mobile) y detalle admin: solo **ACTIVE** + `publicEventId`.
- Ruta canónica confirmada; no se cambió a `/restaurants/` en admin (profileId vs eventId).

### Smoke manual — guía paso a paso

**Prerrequisitos:** API + web en dev; usuario con rol **ADMIN**; tenant `tenant-demo` (o el configurado).

| # | Paso | Resultado esperado |
|---|------|-------------------|
| 1 | Login como ADMIN | Acceso a `/admin` |
| 2 | Ir a `/admin/gastronomicos` | Listado carga; filtros en URL; tabla desktop / cards mobile |
| 3 | **Crear** en `/admin/gastronomicos/nuevo`: sin `ownerUserId`, `publish: false`, estado ACTIVE o DRAFT | `POST` OK → redirect a `…/editar` |
| 4 | Ver listado admin | Local visible con badge estado |
| 5 | Discovery público: `/categoria/gastro`, `/explore?category=gastro` | **No** aparece el local sin publicar |
| 6 | `GET /public/gastro-locations?tenantId=tenant-demo` (opcional) | No incluye el perfil si no ACTIVE + sync |
| 7 | **Editar** `…/editar`: nombre, descripción, subcategoría, ubicación Maps, contacto (`contactPhone`, `websiteUrl`, `menuUrl`) | `PATCH` OK |
| 8 | Subir **cover** y **galería** (GCS) en editar | URLs GCS; sin nuevas `data:` URLs |
| 9 | Activar/publicar: listado → **Activar** o crear con `publish: true` + ACTIVE | `publicEventId` asignado; badge «Sincronizada» |
| 10 | Verificar discovery + ficha | Aparece en categoría/explore; ficha `/gastronomicos/{profileId}` con datos correctos |
| 11 | **Suspender** desde listado (confirmación) | Sigue en admin; **no** en discovery; ficha pública 404/error |
| 12 | Verificar persistencia | `publicEventId` intacto en admin; descuentos/reviews/follows no borrados |
| 13 | Crear/editar con `ownerUserId` válido | Membership OWNER idempotente; dueño opera `/gastro/local` |
| 14 | Portal dueño sin regresión | `/gastro`, `/gastro/local`, `/gastro/local/editar`, descuentos, validaciones, valoraciones |
| 15 | Permisos: usuario no-ADMIN | `/admin/gastronomicos*` bloqueado |
| 16 | Responsive mobile | Listado cards + formulario usables en viewport estrecho |

**Registro smoke en prod/staging:** completar tabla «Ejecución» al correr manualmente en entorno real.

| Entorno | Fecha | Ejecutor | Resultado |
|---------|-------|----------|-----------|
| local dev | 2026-06-02 | revisión código + build | OK estático |
| staging/prod | — | — | Pendiente corrida manual |

### Criterios de aceptación Slice 5

- [x] Flujo crear → editar → publicar → suspender documentado y validado en código
- [x] Admin sin owner; con `ownerUserId`
- [x] Publicado en discovery; suspendido fuera de discovery sin borrar relaciones
- [x] CTA admin usa ruta canónica `/gastronomicos/[profileId]`
- [x] GCS en edición; create con mensaje URLs → editar
- [x] Portal `/gastro` sin campos admin en `mode="owner"`
- [x] Documentación actualizada

---

## Resumen ejecutivo

El cliente solicita que el **ADMIN** pueda cargar y administrar **locales gastronómicos** desde el panel admin, con paridad operativa respecto a **Rentals** y **Excursiones**.

**Hallazgo principal:** el modelo **`GastroProfile` ya es el “local gastronómico”** del dominio. Tiene campos de ficha, ubicación Maps, galería, horarios, subcategoría, visibilidad vía `status` + `publicEventId`, y relaciones con descuentos, contenido, follows y reviews. **No hace falta un modelo nuevo.**

**Brecha:** Admin hoy solo **lista y lee** locales (`GET /admin/gastronomicos*`) y opera **tickets de descuento**. La **carga/edición de ficha** vive exclusivamente en el portal dueño (`POST/PATCH /gastro/local`). Rentals/excursiones sí tienen **CRUD admin completo** (`admin/rental-locations`, `admin/excursion-operators`).

**Decisión recomendada:** reutilizar **`GastroProfile`** + extraer/reutilizar la lógica de **`GastroLocalService.syncPublicEvent`** en un servicio admin dedicado (o método compartido), con endpoints `POST/PATCH/DELETE` (o PATCH de `status`) bajo `/admin/gastronomicos` y UI en `/admin/gastro` o subrutas de `/admin/gastronomicos`.

---

## 1. Estado actual de Gastro

### 1.1 Modelo Prisma — entidad central

| Modelo | Rol | Campos / relaciones relevantes |
|--------|-----|--------------------------------|
| **`GastroProfile`** | Local gastronómico | `displayName`, `legalName`, `summary`, `detail`, `logoUrl`, `bannerUrl`, `galleryUrls` (JSON), `address`, `province`, `city`, `googlePlaceId`, `geoLat`/`geoLng`, `openingHours` (JSON), `openingHoursNote`, contacto, `menuUrl`, `websiteUrl`, `subcategoryId`, **`publicEventId`** (unique), `ratingAvg`/`ratingCount`, `status` (`ProfileStatus`), `createdByUserId` |
| **`UserGastroMembership`** | Dueño ↔ local | `membershipRole: OWNER`, `status`; acceso portal `/gastro` |
| **`GastroContent`** | Editorial por evento | `gastroProfileId`, `eventId`, `type`, `title`, `body`, `imageUrl`, `status`, `sortOrder` |
| **`GastroDiscount`** | Cupones / tickets | `gastroProfileId`, `eventId` (legacy), estados moderación, `qrToken`, claims/validations |
| **`GastroDiscountClaim`** / **`GastroDiscountValidation`** | Reclamo QR + puerta | Scanner PWA |
| **`UserGastroFollow`** | Seguimiento usuario | Alertas `FOLLOWED_GASTRO_NEW_DISCOUNT` |
| **`Event`** (vía `publicEventId`) | Discovery público | `category: 'gastro'`, `status: APPROVED`, sync desde perfil |

**Confirmación:** `GastroProfile` **debe tratarse como “local gastronómico”**. No existe `GastroLocation` ni entidad paralela.

**Visibilidad pública (doble condición):**

```17:28:apps/api/src/public/public-gastro-locations.service.ts
  async list(query: PublicGastroLocationsListQuery) {
    const rows = await this.prisma.gastroProfile.findMany({
      where: {
        tenantId: query.tenantId,
        status: 'ACTIVE',
        publicEventId: { not: null },
        ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      },
```

- Ficha `/gastronomicos/[id]` y `/restaurants/[id]`: API `GET /public/gastro-locations*`.
- **`/categoria/gastro` y `/explore?category=gastro`**: carrusel vía **`repos.events`** (eventos `category=gastro`), no `publicGastro.list`. Por tanto **`syncPublicEvent` es obligatorio** para aparecer en discovery.

### 1.2 Backend — endpoints existentes

#### Portal dueño (`/gastro`)

| Endpoint | Servicio | Notas |
|----------|----------|-------|
| `GET/POST/PATCH /gastro/local` | `gastro-local.service.ts` | Crea/actualiza ficha + **`syncPublicEvent`** |
| `GET/POST/PATCH /gastro/discounts` | `gastro-portal-discounts.service.ts` | Tickets portal |
| `GET/POST/PATCH /gastro/events/:eventId/content` | `gastro-content.service.ts` | Editorial |
| `GET /gastro/dashboard`, `/gastro/validations` | `gastro-dashboard.service.ts` | KPIs |
| `GET/POST /gastro/reviews*` | `gastro-reviews.controller.ts` | Reviews V2 |

Guards: `JwtOrDevAuthGuard` + `GastroRolesGuard` (`ADMIN` \| membership activa).

#### Público

| Endpoint | Archivo |
|----------|---------|
| `GET /public/gastro-locations`, `/:id`, `by-event/:eventId`, `/:id/discounts` | `public-gastro-locations.controller.ts` |
| `GET/POST /public/gastro-discounts/*` | `public-gastro-discounts.controller.ts` |
| `GET /public/events` (`category=gastro`) | `public-events.service.ts` |

#### Admin (hoy)

| Endpoint | Capacidad |
|----------|-----------|
| `GET /admin/gastronomicos` | Listado paginado + filtros (`search`, `status`, `hasPendingDiscounts`) |
| `GET /admin/gastronomicos/:profileId` | Detalle read-only |
| `GET/PATCH/POST … descuentos` | Moderación tickets (aprobar, QR, publicación) |
| `GET/POST /admin/profiles/gastro/pending`, `approve` | Cola legacy; signup actual crea **`ACTIVE`** directo |

**Ausente:** `POST`, `PATCH`, `DELETE` (o deactivate) de **perfil/local**.

#### Registro / apply

| Flujo | Ruta | Resultado |
|-------|------|-----------|
| Signup | `POST /auth/register` (`profileType: GASTRO`) | `GastroProfile` ACTIVE + `UserGastroMembership` OWNER |
| Apply logueado | `POST /profiles/gastro/apply` | Igual |
| Config ficha | `POST /gastro/local` | Campos completos + `publicEventId` |

Schemas: `packages/shared/src/schemas/profile-onboarding.ts`, `gastro-locations.ts`.

### 1.3 Frontend — superficies actuales

| Superficie | Rutas | Datos |
|------------|-------|-------|
| Portal dueño | `/gastro/*` | `repos.gastro` |
| Ficha pública | `/gastronomicos/[id]`, `/restaurants/[id]` | `repos.publicGastro` |
| Discovery | `/categoria/gastro`, `/explore?category=gastro` | `repos.events` |
| Admin descuentos | `/admin/gastronomicos`, `…/[profileId]`, `…/descuentos/[discountId]` | `repos.adminGastro` — **sin editor de local** |
| Formulario ficha | `/gastro/local/editar` → `GastroLocalForm` | `POST/PATCH /gastro/local` |

**Componentes reutilizables ya probados en gastro:**

- `GastroLocalForm` — `apps/web/components/gastro/GastroLocalForm.tsx`
- `EventLocationFields`, `OpeningHoursEditor`, `RentalProductImagesForm`
- GCS: `useGcsImageUpload` con `scope: 'gastro'`, `entityId: gastroProfileId`

### 1.4 Vertical Gastro V2 operativo (no romper)

Cerrado en `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`: QR v1, scanner, contenido Prisma, reviews/follows, GCS imágenes prod, dashboard/validaciones. Cualquier slice admin debe **extender** sin alterar contratos públicos ni flujos del portal dueño.

---

## 2. Comparación con Rentals / Excursiones (Admin)

| Aspecto | **Rentals** (`RentalLocation`) | **Excursiones** (`ExcursionOperator`) | **Gastro** (`GastroProfile`) |
|---------|-------------------------------|--------------------------------------|------------------------------|
| Alta admin | `POST /admin/rental-locations` | `POST /admin/excursion-operators` | **No existe** |
| Edición admin | `PATCH /admin/rental-locations/:id` | `PATCH /admin/excursion-operators/:id` | **No existe** |
| Desactivar | `isActive` + soft `deletedAt` | `isActive` + soft delete | `ProfileStatus` (`SUSPENDED`, etc.) |
| Productos hijos | `Event` (`rentalLocationId`) | `Event` (`excursionOperatorId`) | Descuentos + `GastroContent` (no “productos” tipo rental) |
| Dueño / membership | Sin membership (catálogo admin) | Sin membership | **`UserGastroMembership`** (portal descuentos) |
| Visibilidad pública | `isActive` + productos activos | Idem | `status=ACTIVE` + **`publicEventId`** |
| Discovery | Eventos rental | Eventos excursión | Evento gastro sync + ficha `publicGastro` |
| Controller | Módulo dedicado `admin-rental-locations.controller.ts` | `admin-excursion-operators.controller.ts` | Monolítico `admin.controller.ts` |
| Schemas shared | `createRentalLocationBodySchema`, `updateRentalLocationBodySchema` | `createExcursionOperatorBodySchema`, … | Solo lectura en `admin-gastro.ts`; escritura en `gastroLocalCreateSchema` |
| UI admin list | `/admin/rentals` + CTA crear | `/admin/excursiones` + operadores | `/admin/gastronomicos` — solo ver descuentos |
| UI admin form | `/admin/rentals/locales/nuevo`, `…/editar` | `/admin/excursiones/operadores/nuevo`, `…/editar` | **Ausente** |
| WhatsApp | `whatsappPhone` en local | Parcial | **No** en `GastroProfile` (fuera de alcance salvo producto lo pida) |
| Imágenes GCS | Admin productos + scope rental | scope excursion | Portal `GastroLocalForm` scope gastro |

**Patrón maduro a copiar:** Controller → Zod → Service → Prisma; frontend página local con `RentalLocationFields` / `OpeningHoursEditor` / `RentalProductImagesForm`; listado admin con link crear/editar.

---

## 3. Brecha exacta para carga desde Admin

| # | Brecha | Impacto |
|---|--------|---------|
| B1 | **Sin API admin write** para `GastroProfile` | Admin no puede crear/editar/desactivar locales |
| B2 | **`syncPublicEvent` acoplado a usuario dueño** (`producerId: userId`, membership requerida en portal) | Admin create necesita actor sistema o `createdByUserId` + membership opcional |
| B3 | **Sin UI admin** crear/editar (solo list + discount ops) | Operación depende del dueño en `/gastro/local/editar` |
| B4 | **Listado admin mobile** — hoy lista simple (`ul`), sin tabla desktop / cards responsive como otros módulos admin maduros | UX cliente no cumplida |
| B5 | **Owner opcional** — rentals no tienen dueño; gastro sí para portal descuentos | Decisión producto: local “solo admin” vs vincular usuario |
| B6 | **Schemas shared** — falta `adminGastroLocationCreateSchema` / `Update` (distinto de `gastroLocalCreateSchema` si admin no exige membership) | Validación inconsistente |
| B7 | **Cola `PENDING` legacy** (`/admin/profiles/gastro/pending`) desalineada con signup ACTIVE | Confusión operativa (documentar, no bloqueante) |
| B8 | **`createdByUserId`** en schema sin uso consistente en admin | Oportunidad trazabilidad admin vs self-service |

**Lo que NO falta (reutilizar):**

- Modelo Prisma completo
- Schemas de ficha (`gastroLocalCreateSchema` / `Update`) — base para admin
- `GastroLocalForm` + upload GCS + Maps
- Subcategorías gastro en `/admin/categorias`
- Público `/public/gastro-locations*` y moderación descuentos

---

## 4. Decisión recomendada

### 4.1 Modelo: **reutilizar `GastroProfile`**

**Justificación:**

- Ya concentra ficha, geo, galería, horarios, subcategoría, ratings, descuentos, content, follows.
- Ficha pública y portal dueño ya operan sobre este ID.
- Crear `GastroLocation` duplicaría relaciones (`GastroDiscount.gastroProfileId`, `UserGastroFollow`, etc.) y rompería integraciones.

**Ampliación Prisma:** **no requerida** para el slice mínimo. Opcional futuro:

- `sortOrder Int` (paridad rentals en listados admin) — solo si producto lo pide.
- `whatsappPhone` — solo si se alinea contacto con rentals.

### 4.2 Servicio: extraer lógica compartida

Refactor mínimo (slice 2 backend):

1. Extraer **`syncPublicEvent(profile, actorUserId, galleryUrls)`** a helper/servicio compartido invocable desde `GastroLocalService` y nuevo **`AdminGastroLocationsService`**.
2. Admin create/update **no debe duplicar** mapeo de campos ya en `createMyLocal` / `updateMyLocal`.
3. Para admin sin dueño: usar **`createdByUserId`** = admin user id; **`producerId`** del evento = admin id o usuario master operativo (documentar en runbook).

### 4.3 Visibilidad pública desde admin

| Acción admin | Efecto |
|--------------|--------|
| Crear local + completar ficha + `syncPublicEvent` | Aparece en `/public/gastro-locations*`, `/restaurants/[id]`, discovery eventos |
| `status: SUSPENDED` o `REJECTED` | Oculto en público (filtro `ACTIVE`) |
| `status: DRAFT` sin `publicEventId` | No listado público; similar a perfil post-signup sin ficha |
| Desactivar (“toggle”) | **`PATCH status`** → `SUSPENDED` (equivalente `isActive: false` rental) |

### 4.4 Membership / dueño (decisión producto)

**Recomendación:** admin create con **owner opcional** (`ownerUserId` o email):

- **Con owner:** crear `UserGastroMembership` OWNER → dueño gestiona descuentos en `/gastro`.
- **Sin owner:** local operado 100% por admin (descuentos vía admin existente); portal `/gastro` no aplica hasta asignar owner.

Paridad parcial con rentals (catálogo sin dueño) manteniendo compatibilidad con portal gastro.

---

## 5. Endpoints propuestos

Prefijo sugerido: **`/admin/gastronomicos`** (consistente con listado actual). Alternativa REST: sub-módulo `admin-gastro-locations.controller.ts` (como rentals).

| Método | Ruta | Body / query | Comportamiento |
|--------|------|--------------|----------------|
| GET | `/admin/gastronomicos` | *(existente)* | Mantener; ampliar respuesta con `hasPublicEvent`, `subcategoryName` |
| GET | `/admin/gastronomicos/:profileId` | *(existente)* | Ampliar detalle: galería, horarios, geo, subcategoría, `status` editable |
| **POST** | `/admin/gastronomicos` | `adminGastroLocationCreateSchema` | Crear `GastroProfile` ACTIVE (o DRAFT), optional owner, **`syncPublicEvent`** si ficha completa |
| **PATCH** | `/admin/gastronomicos/:profileId` | `adminGastroLocationUpdateSchema` | Actualizar campos ficha + re-sync evento |
| **PATCH** | `/admin/gastronomicos/:profileId/status` | `{ status: 'active' \| 'suspended' \| … }` | Toggle visibilidad sin editar ficha entera |
| **DELETE** | `/admin/gastronomicos/:profileId` | — | **Soft:** `SUSPENDED` + opcional limpiar discovery; **hard delete** desaconsejado (FK discounts/follows) |

**Schemas nuevos** en `packages/shared/src/schemas/admin-gastro.ts`:

- `adminGastroLocationCreateSchema` — extiende campos de `gastroLocalCreateSchema` + `tenantId?`, `ownerUserId?`, `status?`, `legalName?`
- `adminGastroLocationUpdateSchema` — partial
- `adminGastroLocationStatusPatchSchema`

**Reutilizar:** `gastroLocalLocationSchema`, `rentalOpeningHoursSchema`, `gastroImageRefSchema` (o migrar a solo HTTPS post-GCS).

**Auth:** `@RequireRole(Role.ADMIN)` + tenant isolation (mismo patrón `admin-rental-locations`).

**No tocar:** rutas descuentos existentes; portal `/gastro/*`; público `/public/gastro-locations*`.

---

## 6. Rutas frontend propuestas

| Ruta | Propósito |
|------|-----------|
| `/admin/gastro` o **`/admin/gastronomicos`** | Listado mejorado (filtros actuales + tabla desktop / cards mobile) |
| **`/admin/gastronomicos/nuevo`** | Crear local |
| **`/admin/gastronomicos/[profileId]/editar`** | Editar ficha (reutilizar `GastroLocalForm` o variante `AdminGastroLocationForm`) |
| `/admin/gastronomicos/[profileId]` | Detalle + link editar + tabla descuentos (existente) |
| `/admin/gastronomicos/[profileId]/descuentos/[discountId]` | Sin cambios |

**Nav:** agregar en `portalNavConfig.ts` admin link “Gastro locales” o renombrar copy de “Gastronómicos” para incluir CRUD.

**Capas frontend (patrón obligatorio):**

```
AdminGastroLocationForm → useAdminGastroLocationMutations → repos.adminGastro → ApiRepository
```

**Repos:** extender `adminGastro` en `ApiRepository.ts` + `interfaces.ts` con `createLocation`, `updateLocation`, `patchLocationStatus`.

**Query keys:** ampliar `adminGastroKeys` en `lib/query/keys.ts`; opcional `lib/query/admin-gastro-locations.ts`.

---

## 7. Campos del formulario admin (propuesta)

Basado en `GastroLocalForm` + paridad rentals. Agrupación sugerida:

### Identidad

| Campo | Obligatorio | Notas |
|-------|-------------|-------|
| `displayName` | Sí | Nombre comercial |
| `legalName` | No | Razón social |
| `summary` | No | Max 220 (teaser discovery) |
| `detail` | No | Descripción larga / “about” |
| `subcategoryId` | Recomendado | `SubcategorySelect category="gastro"` desde `/admin/categorias` |

### Ubicación (Maps)

| Campo | Obligatorio | Componente |
|-------|-------------|------------|
| `province`, `city`, `address` | Sí | `EventLocationFields` o `RentalLocationFields` |
| `lat`, `lng`, `googlePlaceId` | Recomendado | `LocationPickerMap` |

### Imágenes (GCS)

| Campo | Componente |
|-------|------------|
| `bannerUrl` (cover) | `RentalProductImagesForm` header |
| `galleryUrls[]` | `RentalProductImagesForm` gallery |
| Config | `{ scope: 'gastro', entityId: profileId }` — en create: POST perfil mínimo primero o upload post-create |

### Horarios y contacto

| Campo | Componente |
|-------|------------|
| `openingHours`, `openingHoursNote` | `OpeningHoursEditor` |
| `contactPhone`, `contactEmail` | Inputs |
| `menuUrl`, `websiteUrl` | URLs opcionales |

### Operación admin

| Campo | Notas |
|-------|-------|
| `status` | ACTIVE / SUSPENDED / DRAFT |
| `ownerUserId` o email | Opcional — membership OWNER |
| Toggle “Publicar en discovery” | Atajo: ACTIVE + trigger `syncPublicEvent` |

**Validación:** Zod shared + `validateGastroLocationValue` en cliente (ya en `location.utils.ts`).

---

## 8. Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Romper `/gastro/local` al refactorizar `syncPublicEvent` | **Alta** | Extraer helper; tests smoke; no cambiar contrato portal |
| Discovery desincronizado (perfil vs evento) | **Alta** | Siempre llamar `syncPublicEvent` en admin PATCH de campos discovery |
| Descuentos huérfanos si se suspende local | Media | Mantener descuentos; filtrar en público por perfil ACTIVE |
| Follows/reviews apuntan a `gastroProfileId` | Media | No hard-delete; usar SUSPENDED |
| Admin create sin `entityId` bloquea GCS | Media | Flujo create mínimo → redirect editar con uploads |
| Duplicar lógica entre portal y admin | Media | Servicio compartido + schemas derivados |
| `producerId` incorrecto en evento sync | Media | Documentar actor; usar admin o owner si existe |
| Confusión rutas `/admin/gastronomicos` vs `/admin/gastro-discounts` | Baja | Redirects ya existen; copy claro en UI |
| Legacy signup ACTIVE vs pending approval | Baja | No reactivar cola sin decisión producto |
| Data-URL en `gastroImageRefSchema` | Baja | Admin forzar HTTPS GCS only en nuevo form |

---

## 9. Plan de slices siguientes

| Slice | Alcance | Entregables |
|-------|---------|-------------|
| **Admin Gastro 2 — Backend** | POST/PATCH/status admin + refactor `syncPublicEvent` + schemas shared | `AdminGastroLocationsService`, tests unit/smoke mínimo |
| **Admin Gastro 3 — Frontend list** | Tabla desktop + cards mobile, filtros, CTA crear | `/admin/gastronomicos` mejorado |
| **Admin Gastro 4 — Frontend form** | Crear/editar reutilizando `GastroLocalForm` | `/nuevo`, `/editar`, repos + hooks |
| **Admin Gastro 5 — QA** | **Cerrado** — smoke en § Slice 5 de este doc | — |
| **Admin Gastro 6 — Contexto** | Actualizar `BACKEND_CONTEXT`, `FRONTEND_CONTEXT`, `CONTEXT_PENDIENTES`, checklist V2 | Referencia en `AI_ENTRYPOINT.md` |

**Fuera de alcance inmediato:** WhatsApp en gastro, unificar legacy `events/:id/discounts`, E2E Playwright dedicado, reactivar cola `PENDING` perfiles.

---

## 10. Criterios de aceptación (bloque Admin Gastro — cerrado 2026-06-02)

- [x] Admin crea local gastronómico con subcategoría, ubicación Maps, cover + galería GCS, horarios y contacto.
- [x] Admin edita local existente sin regresión portal dueño (`/gastro/local`).
- [x] Admin activa/desactiva visibilidad (`status` / equivalente) y el local deja de aparecer en `/public/gastro-locations*` cuando corresponda.
- [x] Local admin aparece en **`/categoria/gastro`**, **`/explore?category=gastro`** (vía evento sync) y ficha **`/gastronomicos/[profileId]`** (canónica; `/restaurants/[eventId]` alias discovery).
- [x] Descuentos, QR/scanner, reviews y follows del local **siguen operativos** sin cambios de contrato.
- [x] Portal `/gastro` intacto para dueños con membership.
- [x] Patrón arquitectónico respetado: Controller → Zod → Service → Prisma; UI → hooks → Repository → API.
- [x] Sin `fetch` directo ni LocalStorage en UI.
- [x] Tenant isolation en todas las rutas admin.
- [x] Smoke manual documentado: Admin crear → ver ficha pública → editar → desactivar (§ Slice 5).

---

## Validación estática del repositorio

Revisión ejecutada sobre `apps/api`, `apps/web`, `packages/shared`, `docs/` (2026-06-02).

### Archivos relevantes encontrados

#### Prisma / shared

| Archivo | Rol |
|---------|-----|
| `apps/api/prisma/schema.prisma` | `GastroProfile`, `GastroContent`, `GastroDiscount*`, `UserGastroFollow`, `UserGastroMembership`, `RentalLocation`, `ExcursionOperator` |
| `packages/shared/src/schemas/gastro-locations.ts` | Portal + público local |
| `packages/shared/src/schemas/admin-gastro.ts` | Admin list/detail descuentos |
| `packages/shared/src/schemas/profile-onboarding.ts` | Signup/apply gastro |
| `packages/shared/src/schemas/rental-locations.ts` | Patrón CRUD admin referencia |
| `packages/shared/src/schemas/excursion-operators.ts` | Patrón CRUD admin referencia |
| `packages/shared/src/schemas/gastro-content.ts` | Editorial |
| `packages/shared/src/schemas/gastro-discounts.ts` | Descuentos portal/público |

#### Backend API

| Archivo | Rol |
|---------|-----|
| `apps/api/src/modules/gastro/gastro-local.service.ts` | CRUD portal + `syncPublicEvent` |
| `apps/api/src/modules/gastro/gastro.controller.ts` | Rutas `/gastro/local` |
| `apps/api/src/modules/gastro/gastro-content.service.ts` | Contenido |
| `apps/api/src/modules/gastro/gastro-portal-discounts.service.ts` | Descuentos portal |
| `apps/api/src/modules/gastro/gastro-dashboard.service.ts` | Dashboard |
| `apps/api/src/modules/gastro/gastro-reviews.controller.ts` | Reviews |
| `apps/api/src/modules/admin/admin-gastro.service.ts` | Admin list/detail descuentos |
| `apps/api/src/modules/admin/admin.controller.ts` | Rutas `/admin/gastronomicos*` |
| `apps/api/src/modules/admin/admin-profiles.service.ts` | Approve gastro pending |
| `apps/api/src/public/public-gastro-locations.controller.ts` | Público locations |
| `apps/api/src/public/public-gastro-locations.service.ts` | Filtro ACTIVE + publicEventId |
| `apps/api/src/public/public-gastro-discounts.controller.ts` | Público descuentos |
| `apps/api/src/modules/rental-locations/admin-rental-locations.controller.ts` | Patrón CRUD admin |
| `apps/api/src/modules/excursion-operators/admin-excursion-operators.controller.ts` | Patrón CRUD admin |
| `apps/api/src/auth/profile-registration.service.ts` | Signup GASTRO |
| `apps/api/src/modules/profiles/profiles.controller.ts` | Apply gastro |
| `apps/api/src/modules/me/me-gastro-follows.controller.ts` | Follows |
| `apps/api/src/scanner/scanner-gastro-discount.service.ts` | Validación QR |

#### Frontend web

| Archivo | Rol |
|---------|-----|
| `apps/web/components/gastro/GastroLocalForm.tsx` | Formulario ficha (reutilizable admin) |
| `apps/web/components/gastro/GastroLocationDetailView.tsx` | Ficha pública |
| `apps/web/app/(portal)/gastro/local/editar/page.tsx` | Edición dueño |
| `apps/web/app/(portal)/admin/gastronomicos/page.tsx` | Listado admin |
| `apps/web/app/(portal)/admin/gastronomicos/[profileId]/page.tsx` | Detalle read-only |
| `apps/web/app/(portal)/admin/rentals/locales/nuevo/page.tsx` | Referencia create rental |
| `apps/web/app/(portal)/admin/rentals/locales/[locationId]/editar/page.tsx` | Referencia edit rental |
| `apps/web/app/(portal)/admin/excursiones/operadores/nuevo/page.tsx` | Referencia create excursión |
| `apps/web/components/admin/gastro/*` | UI descuentos admin |
| `apps/web/components/location/*` | Province/city, Maps |
| `apps/web/components/rentals/RentalProductImagesForm.tsx` | Upload GCS |
| `apps/web/lib/upload/use-gcs-image-upload.ts` | Hook upload |
| `apps/web/repositories/ApiRepository.ts` | `gastro`, `publicGastro`, `adminGastro`, `rentalLocations` |
| `apps/web/lib/query/gastro-public-detail.ts` | Hooks ficha pública |
| `apps/web/lib/query/keys.ts` | `adminGastroKeys` |
| `apps/web/lib/navigation/portalNavConfig.ts` | Nav admin/gastro |

#### Documentación relacionada

| Archivo | Rol |
|---------|-----|
| `docs/audits/GASTRO_HOTELES_V2_AUDIT.md` | Baseline Gastro V2 |
| `docs/gastro/GASTRO_DISCOUNT_QR.md` | QR / scanner |
| `docs/onboarding/REGISTER_GASTRO_FORM.md` | Registro gastro |
| `docs/deploy/GCS_STORAGE_STRATEGY.md` | Upload imágenes |
| `docs/audits/MAPS_LOCATION_AUDIT.md` | Maps / googlePlaceId |

### Modelos Prisma relevantes (resumen)

- **`GastroProfile`** — entidad local (usar para admin)
- **`GastroContent`**, **`GastroDiscount`**, **`GastroDiscountClaim`**, **`GastroDiscountValidation`**
- **`UserGastroMembership`**, **`UserGastroFollow`**
- **`ContentSubcategory`** (`category: 'gastro'`)
- **`Event`** — discovery + `publicEventId`
- **`RentalLocation`**, **`ExcursionOperator`** — patrones admin CRUD (comparación)

### Endpoints existentes (inventario)

| Grupo | Rutas |
|-------|-------|
| Portal | `/gastro/local`, `/gastro/discounts`, `/gastro/content`, `/gastro/dashboard`, `/gastro/validations`, `/gastro/reviews` |
| Público | `/public/gastro-locations*`, `/public/gastro-discounts*`, `/public/events?category=gastro` |
| Admin read | `GET /admin/gastronomicos`, `GET /admin/gastronomicos/:profileId` |
| Admin descuentos | `GET/PATCH/POST …/discuentos*`, `/admin/gastro-discount-tickets*` |
| Admin perfiles | `GET/POST /admin/profiles/gastro/pending`, `approve` |
| Referencia CRUD | `/admin/rental-locations*`, `/admin/excursion-operators*` |
| Usuario | `/me/gastro-follows*` |
| Scanner | `POST /scanner/gastro-discounts/validate` |

### Componentes reutilizables

| Componente | Uso admin gastro propuesto |
|------------|----------------------------|
| `GastroLocalForm` | Base formulario crear/editar |
| `EventLocationFields` / `RentalLocationFields` | Maps + provincia/ciudad |
| `ProvinceCitySelect` | Selects Argentina |
| `OpeningHoursEditor` | Horarios estructurados |
| `RentalProductImagesForm` | Cover + galería GCS |
| `useGcsImageUpload` | Upload `scope: 'gastro'` |
| `SubcategorySelect` | Subcategoría gastro |
| Patrón listado | Mejorar `/admin/gastronomicos` (hoy estilo rental list simple) |

### Riesgos de duplicación o breaking change

| Tipo | Detalle |
|------|---------|
| **Duplicación** | Copiar cuerpo de `createMyLocal` en admin sin extraer servicio compartido |
| **Duplicación** | Nuevo modelo `GastroLocation` paralelo a `GastroProfile` |
| **Duplicación** | Nuevo form admin desde cero ignorando `GastroLocalForm` |
| **Breaking** | Cambiar filtros `public-gastro-locations` sin mantener `ACTIVE` + `publicEventId` |
| **Breaking** | Modificar shape de `GET /public/gastro-locations/:id` usado por ficha y SEO |
| **Breaking** | Alterar `GastroRolesGuard` sin preservar membership + ADMIN |
| **Breaking** | Hard delete `GastroProfile` con FK activas |
| **Breaking** | Cambiar discovery events gastro sin pasar por `syncPublicEvent` |
| **Regresión** | Portal `/gastro/local` deja de sincronizar evento tras refactor |

---

## Referencias cruzadas (post-implementación)

Al cerrar slices 2–6, actualizar:

- `docs/context/AI_ENTRYPOINT.md` — índice auditoría
- `docs/context/BACKEND_CONTEXT.md` — endpoints admin CRUD
- `docs/context/FRONTEND_CONTEXT.md` — rutas `/admin/gastronomicos/nuevo|editar`
- `docs/context/CONTEXT_PENDIENTES.md` — ítem Admin Gastro Locations
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` — criterios cliente

---

*Documento generado en Slice Admin Gastro 1. Sin cambios de código funcional.*
