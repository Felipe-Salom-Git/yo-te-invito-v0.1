# V3.1 Functional Audit — Mejoras cliente

**Fecha:** 2026-06-06  
**Alcance:** Slice 0 — auditoría funcional/técnica previa a implementar `docs/dev/Yo_Te_Invito_Checklist_V3_1_Mejoras_Cliente.md`.  
**Regla Slice 0:** solo documentación; sin cambios de código, Prisma ni UI.

### Slice 1 implementado (2026-06-06) — V3.1-A quick wins funcionales

- **Hints de imagen:** `apps/web/lib/upload/imageUploadHints.ts` + `components/upload/ImageUploadHint.tsx`; integrado en `RentalProductImagesForm` (rentals, excursiones, gastro local, hotel, productora imágenes), `ProducerEventFormFields`, `EventCategoryPublicationFields`, `HotelProfileForm` (logo), `ProducerIdentityForm` (logo), admin excursión legacy edit, gastro contenido editorial.
- **Contadores:** `components/forms/FieldCharacterCounter.tsx`; `RentalSummaryField` refactorizado; aplicado en productora eventos, gastro local, productora subtítulo (160), descuentos gastro (500). Límite resumen **220 sin cambio**.
- **Subcategorías excursiones:** `apps/api/scripts/seed-subcategories.ts` — +7 nuevas (Verano, Invierno, Terrestres, Familiar, Naturaleza, Navegación, Montaña); idempotente; sin Prisma.
- **Fuera de Slice 1:** reorden galería, límite 400/500, subcategorías múltiples, cropper.

### Slice 2 implementado (2026-06-06) — V3.1-A quick wins visuales/UX pública

- **Fondo dark global:** `color-scheme: dark`, fondo en `html`/`body`/`main`, script anti-flash tema, wrapper `(public)/layout`.
- **Calendario/filtros mobile:** `SubcategoryRail` stack vertical; `EventCalendarModal` bottom-sheet mobile, `z-[70]`, Escape + body scroll lock.
- **Descripciones largas:** `PublicDescriptionBlock` reutilizable; `PlaceDetailView` eventos/restaurantes; rentals/gastro/excursiones vía `RentalDescriptionBlock`.
- **Badges cards:** `getContentCardPrimaryBadge` / `getContentCardSecondaryBadge` — subcategoría prioritaria; oculta «Excursión»/«Gastronomía» genéricos.
- **Maps (frontend):** `LocationPickerMap` — estados loading/error/key; fallback con mensaje en prod.
- **Checklist canonical:** `docs/dev/Yo_Te_Invito_Checklist_V3_1_Mejoras_Cliente.md` (redirect en `docs/context/`).
### Slice 3 implementado (2026-06-06) — categorías duplicadas + detalle excursión

- **Home mobile:** `HomeCategoryStrip` oculto `< md`; hero tabs con scroll horizontal.
- **Detalle excursión:** `ExcursionDetailInfoGrid`, `ExcursionDetailSectionHeading`, hero con badge subcategoría green, cards sidebar.

### Slice 4 implementado (2026-06-06) — resúmenes 500 / subtítulo 400

- **`packages/shared/constants/content-limits.ts`** — `PUBLIC_SUMMARY_MAX_LENGTH=500`, `PUBLIC_SUBTITLE_MAX_LENGTH=400`, `trimToPublicSummary`.
- Schemas: events, rentals, excursions, gastro-locations, general-publications, profile-onboarding, producer `shortDescription`.
- API: producer-events, rental/excursion/gastro/admin-general-publications.
- Web: `RentalSummaryField`, `eventFormSchema`, `ProducerIdentityForm`.

### Slice 5 implementado (2026-06-06) — galería reordenable Subir/Bajar

- **`RentalProductImagesForm`** — botones Subir/Bajar; orden persiste vía `galleryImages`/`sortOrder`.
- **`productGallery.ts`** + `rentalProductImagesFromEvent` respetan `sortOrder`.

### Slice 6 implementado (2026-06-06) — links externos gastro + excursiones

- **Migración:** `20260610120000_external_links_gastro_excursion` — `GastroProfile.bookingUrl/socialLinks`, `ExcursionOperator.websiteUrl/bookingUrl/socialLinks`.
- **Shared:** `schemas/external-links.ts` — URLs http(s) seguras, `EntitySocialLinks`, helpers parse/normalize.
- **Formularios:** `ExternalLinksFormFields` en `GastroLocalForm`, admin operador excursión nuevo/editar.
- **Público:** `PublicExternalLinksCard` en `/gastronomicos/[id]`, `/excursiones/[id]` (datos del operador).
- **WhatsApp:** sin campo nuevo; `contactPhone` + helpers existentes.
- **Fuera de Slice 6:** §5.2 links embebidos en descripciones (HTML/Markdown).

### Slice 7 implementado (2026-06-06) — horarios, punto de encuentro y ubicación en excursiones

- **Auditoría / decisión:** producto excursión = `Event` (`category: excursion`) + `ExcursionOperator`; `Event.startAt` sigue siendo placeholder (`now` al crear) — **no** usar para horario público.
- **Migración:** `20260611120000_excursion_schedule_fields` — en `Event`: `excursionDepartureTime`, `excursionDurationText`, `excursionAvailableDaysText`, `excursionScheduleNotes`, `excursionMeetingPoint` (texto, solo excursiones).
- **Ubicación:** reutiliza `venueAddress`, `city`, `province`, `geoLat`, `geoLng`, `googlePlaceId` en `Event` como override opcional; si vacíos, detalle público hereda operador (`resolveExcursionPublicLocation`). Al crear excursión **ya no** se copia ubicación del operador al evento (solo si el form marca ubicación propia).
- **Shared:** `schemas/excursion-schedule.ts`; extendidos `excursion-operators` (create/update product) y `eventDetailSchema` (`excursionSchedule`).
- **API:** `excursion-schedule.util.ts`; `excursion-operators.service`, `public-events.service`, `producer-events-crud` (legacy admin patch).
- **Formularios:** `ExcursionScheduleFormFields` + ubicación opcional en admin `.../operadores/.../excursiones/nuevo|editar` y legacy `admin/excursiones/[id]/editar`.
- **Público `/excursiones/[id]`:** `ExcursionSchedulePublicSections` — secciones «Horarios y duración», «Punto de encuentro», «Ubicación», «Observaciones»; mapa vía `EventLocationModal` (Slice 2 fallback intacto). Links externos siguen en `PublicExternalLinksCard` (Slice 6).
- **Fuera de Slice 7:** agenda/cupo/reservas por horario, FAQs (§7.2), ubicación distinta por publicación avanzada, horario en cards de listado.

### Slice 8 implementado (2026-06-06) — subcategorías múltiples fase 1 (excursiones)

- **Modelo:** `EventSubcategory` (`eventId`, `subcategoryId`, `isPrimary`); `Event.subcategoryId` = principal legacy.
- **Migración:** `20260612120000_event_subcategories` + backfill idempotente desde `Event.subcategoryId`.
- **Shared:** `event-subcategories.ts` — `subcategoryIds`, `resolveExcursionSubcategorySelection`, `eventSubcategoryPublicSchema`.
- **API:** `event-subcategories.util.ts`; `excursion-operators.service` (transacción sync); `public-events.service` (filtros OR + `subcategories` en detalle); `producer-events-crud` (legacy admin excursión).
- **Web:** `ExcursionSubcategoryMultiSelect` — chips, principal = primera; formularios admin operador + legacy; detalle muestra todas en `ExcursionDetailInfoGrid`.
- **Filtros:** list/search/calendar vía `subcategoryFilterWhere` — matchea FK principal o junction.
- **Fuera fase 1:** multi-select en eventos/gastro/rentals.

### Slice 7.5 implementado (2026-06-06) — consolidación post-migraciones

- **Smoke doc:** `docs/audits/V3_1_SLICE_7_5_STABILIZATION_SMOKE.md`
- **Script:** `pnpm --filter api run smoke:v31-stabilization` — columnas DB + roundtrip efímero Slice 6/7/8 schema (cleanup automático).
- **Validado sin DB:** `prisma generate`, `prisma validate`, `shared`/`api`/`web` lint+build.
- **DB local:** requiere Docker + `prisma migrate deploy` (bloqueado si Postgres no alcanzable).
- **Sin cambios de código productivo** salvo script smoke; Getnet/pagos intactos.

### Slice 8.5 implementado (2026-06-06) — validación DB y smoke post-subcategorías

- **Smoke doc:** `docs/audits/V3_1_SLICE_8_5_SUBCATEGORIES_SMOKE.md`
- **Script nuevo:** `pnpm --filter api run smoke:v31-subcategories` — schema `EventSubcategory`, create/edit/sync, filtro secundaria, detail shape, backfill sample.
- **Stabilization:** cleanup `EventSubcategory` antes de borrar evento en `smoke-v31-stabilization.ts`.
- **Migraciones acumuladas (3):** `20260610120000_external_links_gastro_excursion`, `20260611120000_excursion_schedule_fields`, `20260612120000_event_subcategories` — **pendiente `migrate deploy` local** (Docker Desktop no disponible).
- **Validado sin DB:** `prisma generate`, `shared`/`api`/`web` lint+build OK.
- **Pendiente:** `migrate deploy` + ambos smokes + smoke manual UI antes de Slice 9 (admin archivar).
- **Sin features nuevas;** Getnet/pagos intactos.

### Slice 9 implementado (2026-06-06) — admin archivar/dar de baja

- **Estrategia:** baja lógica — `Event` `PAUSED`/`APPROVED`; `RentalLocation`/`ExcursionOperator` `isActive`; gastro `SUSPENDED`/`ACTIVE`.
- **Migración:** `20260613120000_admin_content_lifecycle_audit` (AuditAction).
- **API:** `AdminContentLifecycleService` + endpoints pause/restore/deactivate/activate; audit gastro en `updateStatus`.
- **Público:** `public-content-availability.util.ts` — oculta eventos con padre rental/excursion inactivo.
- **Web:** acciones confirmadas en `/admin/eventos`, rentals locales, operadores excursión; gastro ya tenía suspender.
- **Smoke:** `smoke:v31-admin-archive`; regresión V3.1 OK.
- **Fuera:** hoteles archivar, banners, wizard productora, Getnet/pagos.

- **Pendiente:** maps prod/referrer, drag & drop galería, wizard productora, banners editoriales, etc.

**Referencias:** `AI_ENTRYPOINT.md`, `PROJECT_CONTEXT.md`, `BACKEND_CONTEXT.md`, `FRONTEND_CONTEXT.md`, `CONTEXT_PENDIENTES.md`, checklist V3.1, V2.2 pendientes producción, `docs/audits/MAPS_LOCATION_AUDIT.md`, `docs/legal/LEGAL_ADMIN_MODULE.md`.

---

## 1. Resumen ejecutivo

Yo Te Invito tiene **infraestructura sólida** en storage GCS, maps, legales versionados, subcategorías admin y discovery público (V2 cerrado). La checklist V3.1 pide sobre todo **pulido UX/contenido** y **huecos funcionales** que hoy no existen o están a medias.

**Estado general por bloque auditado:**

| Bloque | Madurez actual | Esfuerzo típico |
|--------|----------------|-----------------|
| Imágenes / galería | GCS operativo; hints y reorder faltan | Bajo–medio (UI) |
| Resúmenes 400/500 | Límite unificado **220**; contador parcial | Bajo–medio (schema + forms + cards) |
| Maps / ubicación | Prod OK (Maps 5); excursiones heredan operador | Medio (forms + detalle) |
| Links externos | Parcial en gastro/hotel/rental/productor; **no** en excursiones | Medio (modelo + UI pública) |
| Excursiones horarios | `startAt` placeholder; horario operador genérico | Medio–alto (campos nuevos) |
| Subcategorías múltiples | Solo `subcategoryId` FK único | **Alto** (migración + filtros) |
| Admin eliminar/archivar | Sin delete admin de publicaciones | **Alto** (estratégia + FK) |
| Banners por categoría | Ordenar eventos existentes; **no** banners editoriales | Medio (modelo nuevo) |
| Wizard productora 3 pasos | Formulario largo en una pantalla | Medio (UI, sin rewrite API) |
| Legal al publicar evento | Módulo legal listo; **sin** gate en publish | Medio (contexto + compliance) |

**Recomendación de orden:** empezar por **quick wins** (hints de imagen, contadores, ampliar resumen con corte visual en cards, reorden galería con botones ↑↓, fix maps operador si es config), luego **funcional medio** (links excursiones/gastro, horarios excursiones, wizard productora, banners editoriales), y dejar para **tandas 3–4** las piezas de **modelo/datos y riesgo operativo** (subcategorías múltiples, admin archivar/eliminar, legal bloqueante al publicar).

---

## 2. Clasificación por tipo de cambio

| Mejora | Tipo | Prisma | API | Shared | UI | Riesgo | Prioridad |
|--------|------|:------:|:---:|:------:|:--:|:------:|:---------:|
| Medidas recomendadas imágenes (§2.1–2.2) | UI/Formulario | — | — | Opc. | ✓ | Bajo | Alta |
| Reorden galería ↑↓ (§2.3) | UI/Formulario | — | — | — | ✓ | Bajo | Media |
| Ampliar resumen 400/500 (§6.1–6.2) | API/Schema | — | ✓ | ✓ | ✓ | Medio | Alta |
| Contador caracteres en todos los forms | UI/Formulario | — | — | — | ✓ | Bajo | Alta |
| Maps falla operador (§4.1) | Integración externa | — | — | — | ✓ | Medio | Alta |
| Maps/ubicación excursiones (§4.2) | Discovery público | Opc. | ✓ | ✓ | ✓ | Medio | Alta |
| Links externos excursiones/gastro (§5.1) | Modelo de datos | ✓ | ✓ | ✓ | ✓ | Medio | Alta |
| Horarios excursiones (§7.1) | Modelo de datos | ✓ | ✓ | ✓ | ✓ | Medio | Alta |
| Subcategorías múltiples (§3.1) | Modelo de datos | ✓ | ✓ | ✓ | ✓ | **Alto** | Alta |
| Nuevas subcategorías excursiones (§3.2) | Admin operativo | — | ✓ | — | ✓ | Bajo | Alta |
| Admin eliminar/archivar (§11.1) | Admin operativo | Opc. | ✓ | ✓ | ✓ | **Alto** | Alta |
| Banners editoriales por categoría (§11.2) | Modelo de datos | ✓ | ✓ | ✓ | ✓ | Medio | **Cerrado Slice 10** |
| Wizard productora 3 pasos (§12.1) | UI/Formulario | — | — | — | ✓ | Medio | Alta |
| Legal al publicar evento (§12.2) | Legal/Compliance | Opc. | ✓ | ✓ | ✓ | Medio–Alto | Alta |
| Fondo dark global (§1.1) | UI/Formulario | — | — | — | ✓ | Bajo | Alta |
| Calendario tapa filtros (§1.3) | UI/Formulario | — | — | — | ✓ | Bajo | Alta |
| Scroll interno / Leer más (§1.6–1.7, §13) | Discovery público | — | — | — | ✓ | Bajo–Medio | Alta |
| Etiquetas cards (§1.4) | Discovery público | — | Opc. | — | ✓ | Bajo | Media |
| Detalle excursión visual (§1.5) | Discovery público | — | — | — | ✓ | Bajo | Media |
| Filtros sutiles carrusel (§3.3) | UI/Formulario | — | — | — | ✓ | Bajo | Media |
| Cards editoriales (§14) | Discovery público | — | — | — | ✓ | Medio | Media |
| Ratings 5/5 visual (§15) | UI/Formulario | — | Opc. | — | ✓ | Medio | Media |
| Buscador compacto (§9.1) | UX / Navegación | — | — | — | ✓ | Medio | Media |
| «Lo espero» copy (§8.1) | UX / Producto | — | — | — | ✓ | Bajo | Media |
| FAQs excursión (§7.2) | Modelo de datos | ✓ | ✓ | ✓ | ✓ | Medio | Baja (V3.2) |
| Links en descripción / Markdown (§5.2) | Funcional / Seguridad | Opc. | ✓ | ✓ | ✓ | Alto | V3.2 |

**Tipos:** UI/Formulario · API/Schema · Modelo de datos · Admin operativo · Integración externa · Legal/Compliance · Discovery público.

---

## 3. Mejoras quick win

Cambios acotados, reversibles, sin migración Prisma (salvo seed de subcategorías):

1. **Hints de imagen centralizados** — helper `imageUploadHints.ts` + copy en `RentalProductImagesForm`, `ProducerEventFormFields`, `EventCategoryPublicationFields`, `HotelProfileForm`, `GastroLocalForm` (formato JPG/PNG/WebP, máx. 5 MB, ratios sugeridos: portada 16:9, galería cuadrada ~1080px).
2. **Contador de caracteres reutilizable** — extraer patrón de `RentalSummaryField` a `CharCountTextArea`; cablear en gastro (`GastroLocalForm`), productora (`ProducerEventFormFields`), admin eventos si se agrega summary.
3. **Reorden galería con botones ↑↓** — solo estado local + mismo payload al guardar (`sortOrder` / orden de array ya persistido en API); evitar drag & drop en V3.1.
4. **Nuevas subcategorías excursiones** — alta vía `/admin/categorias` o `seed:subcategories` controlado (sin cambio de modelo).
5. **Etiquetas cards** — lógica en `contentCardPresentation.ts` / `ContentCard`: ocultar badge genérico «Excursión»; priorizar `subcategoryName`.
6. **Fix maps operador (si es env)** — verificar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en build web + referrers portal admin (`/admin/*` bajo mismo dominio); smoke `smoke:maps-location`.
7. **Fondo dark / calendario / scroll descripción** — CSS y layout en rutas públicas; componente `ReadMoreModal` compartido.
8. **Copy «Lo espero»** — solo strings en `EventEngagementRow` / `domainLabels`.

---

## 4. Mejoras de riesgo medio

Requieren tocar frontend + backend/shared, sin migración grande:

1. **Ampliar resumen a 400/500** — actualizar `excursionProductSummarySchema`, `rentalProductSummarySchema`, `eventUpdateDtoSchema`, `gastro-locations`, `RENTAL_SUMMARY_MAX_LENGTH`, slices API (`*.slice(0, 220)`), y **mantener** `line-clamp` en `ContentCard` / héroes.
2. **Links externos en excursiones y gastro** — campos estructurados en `Event` (excursion) y/o `GastroProfile`; reutilizar `urlOptional` / `httpsUrlSchema`; UI tipo `HotelLinksCard` / `GastroLocationLinksCard`.
3. **Horarios excursiones (MVP)** — JSON en `Event` o campos texto (`scheduleNote`, `durationMinutes`, `meetingPoint`) + bloque en `ExcursionProductDetailContent`; no reutilizar solo `Event.startAt` (hoy se setea `now` al crear).
4. **Ubicación por excursión en formulario nuevo** — opcional `EventLocationFields` en alta excursión admin (hoy hereda 100% del operador).
5. **Wizard productora 3 pasos** — envolver `ProducerEventFormFields` en stepper (patrón `RegisterWizard`); misma mutación create/update.
6. **Banners editoriales** — nuevo modelo `CategoryEditorialBanner` (imagen GCS, título, subtítulo, categoría, activo, orden) vs extender `CategoryBannerItem` (hoy solo `eventId`).
7. **Legal al publicar (fase 1)** — nuevo contexto `EVENT_PUBLISH` o reutilizar `PORTAL_ACCESS` con **bloqueo** en transición a `PENDING`; extender `UserLegalAcceptance` con `eventId` opcional.
8. **Maps en detalle excursión** — ya existe merge operador/evento + `EventLocationModal`; completar datos en carga admin.

---

## 5. Mejoras de alto riesgo

Requieren migración, compatibilidad o impacto en filtros/listados/comercio:

1. **Subcategorías múltiples (§3.1)** — tabla puente `EventSubcategory` / `GastroProfileSubcategory`; mantener `subcategoryId` legacy como «principal»; actualizar `applySubcategoryFilter`, explore URL, carruseles, cards, seeds, admin y productora.
2. **Admin eliminar/archivar publicaciones (§11.1)** — riesgo FK: `Order`, `Ticket`, `Payment`, `Review`, `TicketScanLog`, `ReferralAttribution`, `CategoryBannerItem`, audit. Estrategia: `status ARCHIVED` + `deletedAt` soft + ocultar público; **prohibir** hard delete si hay órdenes.
3. **Legal bloqueante con contenido bootstrap** — publicar `producer_terms` real antes de enforcement; riesgo bloquear productoras con legales placeholder.
4. **Palabras cliqueables / HTML en descripciones (§5.2)** — superficie XSS; posponer a V3.2.
5. **Migración ratings 1–10 → 1–5 en DB (§15)** — impacto ranking, filtros, reportes admin; V3.1 solo conversión visual.
6. **Rediseño cards editoriales global (§14)** — regresión en carruseles home/categoría/explore.

---

## 6. Análisis por bloque funcional

### 6.1 Imágenes y galería

**Estado actual**

- Upload GCS **cerrado en prod** (`POST /uploads/public-image`, `useGcsImageUpload`, `RentalProductImagesForm`).
- Límites centralizados: **5 MB**, MIME **JPEG/PNG/WebP** (`validate-public-image-file.ts`, `upload-config.ts`).
- **Sin** helper compartido de dimensiones en píxeles; copy disperso («16:9» solo en productora eventos).
- Galería: orden **persistido** vía `EventMedia.sortOrder` (índice al guardar) o `galleryUrls[]` en perfiles; lectura pública `orderBy sortOrder asc`.
- **Sin UI de reorden** — solo eliminar y volver a subir; append define orden.

**Superficies de carga**

| Área | Rutas / componentes | Qué sube | GCS |
|------|---------------------|----------|:---:|
| Admin eventos | `admin/publicaciones-generales/nuevo` → `EventCategoryPublicationFields` | Portada | ✓ |
| Admin excursiones (operador) | `admin/excursiones/operadores/.../excursiones/nuevo\|editar` | Header + galería | ✓ |
| Admin excursiones legacy | `admin/excursiones/[id]/editar` | Solo portada | ✓ |
| Productora eventos | `producer/events/new`, `.../edit` → `ProducerEventFormFields` | Solo portada | ✓ |
| Admin gastro | `admin/gastronomicos/nuevo\|editar` → `GastroLocalForm` | Banner + galería | ✓ (edit); create URL hasta tener id |
| Portal gastro | `gastro/local/editar`, `gastro/contenido`, `gastro/descuentos` | Local, editorial, tickets | ✓ |
| Portal hotel | `hotel/editar` → `HotelProfileForm` | Logo, banner, galería | ✓ |
| Admin rentals | `admin/rentals/.../productos/` → `RentalProductImagesForm` | Header + galería | ✓ |
| Productora perfil | `producer/profile/identity`, `.../images` | Logo, cover, galería | ✓ |
| Admin rentals general pub. | `ServiceCategoryPublicationFields` (rental) | Header + galería | Parcial (sin GCS en rental path legacy) |

**Archivos relevantes**

- `apps/web/lib/upload/use-gcs-image-upload.ts`, `gcs-image-upload-config.ts`, `validate-public-image-file.ts`
- `apps/web/components/rentals/RentalProductImagesForm.tsx`
- `apps/api/src/modules/rental-locations/rental-product-images.util.ts`
- `packages/shared/src/schemas/public-image-upload.ts`
- `docs/deploy/GCS_STORAGE_STRATEGY.md`

**Riesgos**

- Reorden solo UI: bajo si se respeta orden del array al PATCH.
- Unificar hints sin tocar validación: ninguno.
- Cropper/reposicionamiento: fuera de V3.1.

**Recomendación**

- Slice B1: helper de hints + aplicar en formularios GCS existentes.
- Slice B2: botones ↑↓ en `RentalProductImagesForm` (beneficia rentals, excursiones, gastro, hotel, productora).
- Posponer drag & drop y cropper a V3.2.

**Slice sugerido posterior:** `V3.1-B1-image-hints`, `V3.1-B2-gallery-reorder`.

---

### 6.2 Resúmenes y límites de caracteres

**Estado actual**

- **`summary` máximo 220** en shared: `events.ts`, `general-publications.ts`, `gastro-locations.ts`, `excursion-operators.ts`, `rental-locations.ts`.
- Checklist menciona 200; código usa **220** de forma consistente.
- **`description`**: sin max en eventos/excursiones/rental product; gastro/hotel hasta 10_000.
- **`shortDescription` productora**: 160 (PATCH) vs 500 (signup) — inconsistencia.
- Contador: solo `RentalSummaryField` + constante `RENTAL_SUMMARY_MAX_LENGTH` en `lib/rentals/rentalSummary.ts`.
- Backend defensivo: `.slice(0, 220)` en `producer-events-crud`, `excursion-operators`, `rental-locations`, `admin-general-publications`, `gastro-profile-fields.util`.
- Cards: `line-clamp-2/3` en `ContentCard`, héroes rental/excursión; truncado hero 160 chars en `getRentalHeroSummaryText`.

**Formularios sin contador**

- `GastroLocalForm` (`maxLength={220}` hardcoded)
- `ProducerEventFormFields`
- `EventCategoryPublicationFields` (admin eventos sin campo summary en create)

**Impacto subir a 400/500**

- Bajo en API/DB (campo `String` sin límite Prisma).
- Medio en UX: cards y modales deben seguir clamp; detalle puede mostrar más.
- Actualizar ~8 schemas shared + 5 servicios API + `eventFormSchema` web + gastro hardcode.

**Archivos relevantes**

- `packages/shared/src/schemas/*.ts` (summary schemas)
- `apps/web/components/rentals/RentalSummaryField.tsx`
- `apps/web/lib/schemas/event.ts`, `lib/producer/producer-event-form.utils.ts`
- `apps/web/components/home/ContentCard.tsx`

**Riesgos**

- Resumen largo en listados sin clamp rompe rails mobile.
- Desalinear frontend 500 vs backend 220 hasta deploy coordinado.

**Recomendación**

- Definir **un solo límite** (400 o 500) en `packages/shared` constante exportada.
- Crear `CharCountTextArea` reutilizable.
- Slice acotado: schema + API + forms; QA visual en home/explore/categoría.

**Slice sugerido posterior:** `V3.1-B3-summary-limits`.

---

### 6.3 Maps y ubicación

**Estado actual**

- Maps **prod OK** (2026-06-01): `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, migración `googlePlaceId` + `province` en `Event`, `RentalLocation`, `ExcursionOperator`, `GastroProfile`, `HotelProfile`.
- Stack UI: `LocationPickerMap` → `LocationPickerMapGoogle` + `LocationPickerMapFallback`; `useGoogleMaps.ts`.
- Público: `lib/maps/public-location.ts`, `EventLocationModal`, JSON-LD en `lib/seo/jsonld.ts`.
- Productora perfil: solo **ciudad texto** (sin mapa).

**Componentes y uso**

| Componente | Usado en |
|------------|----------|
| `EventLocationFields` | Productora eventos, admin publicaciones, gastro, hotel, legacy excursión edit |
| `RentalLocationFields` | Admin rental locales, **admin excursion operadores** nuevo/editar |

**Excursiones**

- Operador: geo completo en `ExcursionOperator` + form `RentalLocationFields`.
- Producto excursión (`Event`): al crear se **copia** ubicación del operador; form nuevo (`.../excursiones/nuevo`) **no** pide ubicación propia.
- Detalle público: `ExcursionProductDetailContent` (ruta `/excursiones/[id]`) — merge `operator ?? event` para mapa y «Ver ubicación».
- `PlaceDetailView` ya no es el layout principal de excursión (reemplazado por layout rental-style).

**Maps falla en operador (§4.1) — causas probables**

1. `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` ausente en build web del entorno afectado.
2. Restricción referrer GCP no incluye URL exacta (www vs apex, rutas portal).
3. Componente montado antes de cargar script (`useGoogleMaps` error en consola).
4. Fallback manual debería activarse; si UI queda rota, revisar `LocationPickerMap.tsx` branch.
5. No hay portal productor de excursiones — solo **admin** `/admin/excursiones/operadores/*`.

**Qué falta para mapa en detalle excursión**

- Datos: ya se muestran si operador o evento tienen address/geo.
- Falta **carga explícita** de punto de encuentro por excursión y copy «punto de salida».

**Archivos relevantes**

- `apps/web/components/location/*`
- `apps/web/components/excursions/ExcursionProductDetailContent.tsx`
- `apps/api/prisma/schema.prisma` (modelos geo)
- `docs/audits/MAPS_LOCATION_AUDIT.md`
- `apps/api/scripts/smoke-maps-location.ts`

**Riesgos**

- Mezclar ubicación operador vs excursión sin documentar precedencia (hoy operador gana en merge).
- Backfill legacy sin `googlePlaceId`.

**Recomendación**

- Slice A: diagnosticar maps operador (env, consola, smoke).
- Slice B: campo opcional ubicación excursión + bloque mapa en detalle si hay coords.
- Mantener fallback manual siempre.

**Slice sugerido posterior:** `V3.1-A-maps-operator-fix`, `V3.1-B-excursion-location`.

---

### 6.4 Links externos y redes

**Estado actual**

| Campo | Modelos | Vertical |
|-------|---------|----------|
| `websiteUrl` | GastroProfile, HotelProfile, RentalLocation | Gastro, hotel, rental local |
| `menuUrl` | GastroProfile | Gastro |
| `bookingUrl` | HotelProfile | Hotel |
| `whatsappPhone` | RentalLocation, HotelProfile | Rental, hotel |
| `socialLinks` JSON | ProducerProfile, HotelProfile | Productora, hotel |
| `contactPhone` / `contactEmail` | Gastro, rental, ExcursionOperator | Varios |

**No existen en Prisma:** `facebookUrl`, `tiktokUrl`, `youtubeUrl`, `externalUrl` como columnas. Facebook solo en `HotelProfile.socialLinks`.

**Excursiones / Eventos:** sin campos de redes ni web.

**Validación URL**

- `httpsUrlSchema` (`profile-onboarding.ts`), `urlOptional` por vertical en shared.
- Rental API `normalizeUrl()` más leniente que Zod.
- Instagram productora: string plano, no URL estricta.

**UI pública**

- `HotelLinksCard`, `GastroLocationLinksCard`, `PublicProducerPageContent`
- Excursiones: sin card de links

**Archivos relevantes**

- `packages/shared/src/schemas/gastro-locations.ts`, `hotel-profile.ts`, `producer.schema.ts`, `rental-locations.ts`
- `apps/web/components/hotel/HotelLinksCard.tsx`, `gastro/GastroLocationLinksCard.tsx`
- `apps/api/prisma/schema.prisma`

**Riesgos**

- HTML/Markdown en descripciones (§5.2): XSS — preferir campos estructurados en V3.1.
- Duplicar validación URL fuera de shared.

**Recomendación**

- Agregar bloque `socialLinks` o columnas opcionales en `Event` (category=excursion) y ampliar `GastroProfile` (instagram, whatsapp).
- Reutilizar patrón hotel/productor para render en detalle público (`target="_blank"`, `rel="noopener"`).
- Posponer enlaces inline en texto a V3.2.

**Slice sugerido posterior:** `V3.1-B-external-links`.

---

### 6.5 Excursiones — horarios y datos faltantes

**Estado actual**

- Excursiones = `Event` con `category: 'excursion'`, `excursionOperatorId`, `isTicketingEnabled: false`.
- Carga admin: `admin/excursiones/operadores/[operatorId]/excursiones/nuevo|editar`.
- Al **crear**, API setea `startAt: now` (placeholder), `endAt: null` — no representa horario real.
- Operador: `openingHours` JSON (mismo schema que rental) + `openingHoursNote` — horario de **atención del operador**, no de la salida de cada excursión.
- Legacy: `admin/excursiones/[id]/editar` permite `startAt` manual + `EventLocationFields`.
- Detalle público: `ExcursionProductDetailContent` + `ExcursionOperatorCard` (`RentalOpeningHoursSummary`).
- Sin campos: duración, días disponibles, punto de encuentro dedicado, observaciones de horario.

**Archivos relevantes**

- `apps/api/src/modules/excursion-operators/excursion-operators.service.ts`
- `packages/shared/src/schemas/excursion-operators.ts`
- `apps/web/components/excursions/ExcursionProductDetailContent.tsx`, `ExcursionOperatorCard.tsx`
- `apps/web/app/(portal)/admin/excursiones/operadores/...`

**Riesgos**

- Reutilizar `Event.startAt` para excursiones sin ticketing confunde filtros de fecha en explore (excursiones no caducan por visibility rule, pero cards podrían mostrar fecha irrelevante).
- Horario en descripción libre no es auditable ni filtrable.

**Recomendación**

- Nuevos campos estructurados en `Event` (solo excursion) o JSON `excursionSchedule` en shared:
  - `departureTime`, `durationMinutes`, `availableDays`, `meetingPoint`, `scheduleNotes`.
- Bloque UI en detalle (cards con íconos, §1.5).
- Form admin excursión: sección «Horario» separada de descripción.
- Cards: mostrar duración/ciudad; ocultar fecha `startAt` placeholder hasta tener dato real.

**Slice sugerido posterior:** `V3.1-B-excursion-schedule`.

---

### 6.6 Subcategorías múltiples

**Estado actual**

- **Un solo FK:** `Event.subcategoryId`, `GastroProfile.subcategoryId` → `ContentSubcategory`.
- Sin tabla many-to-many de contenido.
- `User.preferences.favoriteSubcategoryIds[]` es multi-select de **usuario**, no de publicación.
- Resolución: `SubcategoriesService.resolveSubcategoryForEvent()`.
- Filtros: `PublicEventsService.applySubcategoryFilter()` por id o slug; explore URL `subcategoryId`; admin listados.
- Display: `subcategoryName` en API summary → `ContentCard`, héroes, banners.
- Admin: `/admin/categorias` CRUD; «delete» = `isActive: false`.

**Impacto multi-subcategoría**

| Área | Cambio |
|------|--------|
| Prisma | Tabla `EventContentSubcategory` (+ opcional gastro) |
| API list/search | `some` en relación; índices |
| Explore / home / categoría | Filtros OR; chips múltiples en cards |
| Forms | Multi-select `SubcategorySelect` |
| Legacy | Backfill: copiar `subcategoryId` → primera fila puente |

**Camino compatible recomendado**

1. Mantener `subcategoryId` como **principal legacy** (primera subcategoría, ranking, banner).
2. Agregar relación múltiple nueva sin borrar columna.
3. Migrar progresivamente; **empezar solo excursiones** si se quiere reducir radio.
4. Filtros públicos: publicación coincide si **alguna** subcategoría coincide.

**Riesgos**

- **Alto:** carruseles, SEO, alertas `FAVORITE_INTEREST_NEW_CONTENT` (matching subcategoría).
- Compatibilidad contenido existente con un solo id.
- Seed §3.2 (nuevas subcategorías) es independiente y de bajo riesgo.

**Archivos relevantes**

- `apps/api/prisma/schema.prisma` (`Event`, `ContentSubcategory`)
- `apps/api/src/modules/subcategories/subcategories.service.ts`
- `apps/api/src/public/public-events.service.ts`
- `apps/web/lib/explore/exploreFilters.ts`
- `apps/web/components/forms/SubcategorySelect.tsx`

**Slice sugerido posterior:** `V3.1-C1-multi-subcategory-audit-migration`, `V3.1-C2-multi-subcategory-excursion-pilot`.

---

### 6.7 Admin archivar / eliminar

**Estado actual**

| Entidad | Delete real hoy | Patrón vigente |
|---------|-----------------|----------------|
| Event / excursión producto | No endpoint admin delete | Estados: DRAFT, PENDING, APPROVED, PAUSED, CANCELLED; `deletedAt` en modelo sin uso operativo |
| Gastro local | No delete | `ProfileStatus` SUSPENDED; sync evento PAUSED |
| Rental local / producto | Soft delete local | `deletedAt` + `isActive`; producto media soft-delete |
| Excursion operador | Soft delete | `deletedAt` + `isActive` |
| Hotel | No delete | Profile status |
| Subcategoría | Deactivate | `isActive: false` |
| CategoryBannerItem | Hard delete al limpiar lista | Join a `Event` |

**Riesgos borrado físico**

- **Tickets, orders, payments** ligados a `Event`.
- **Reviews**, **scans**, **referrals**, **CategoryBannerItem** (`onDelete: Cascade`).
- **Audit logs** deben registrar archivado, no borrar historial.

**Estrategia segura recomendada**

1. **Archivar** (`status: ARCHIVED` o reutilizar `CANCELLED` + flag `archivedAt`) — ocultar de público y listados admin por defecto.
2. Soft delete (`deletedAt`) solo sin órdenes/tickets — o nunca hard delete en producción.
3. Confirmación modal + motivo opcional.
4. `AuditLog`: `EVENT_ARCHIVED`, `GASTRO_LOCATION_ARCHIVED`, etc.
5. Gastro/rental: seguir patrón suspend + evento PAUSED ya existente.

**Archivos relevantes**

- `apps/api/src/modules/admin/admin-events.service.ts`
- `apps/api/src/modules/admin/admin-gastro-locations.service.ts`
- `apps/api/src/modules/rental-locations/rental-locations.service.ts`
- `apps/api/src/modules/excursion-operators/excursion-operators.service.ts`
- `apps/web/app/(portal)/admin/eventos/`, `admin/gastronomicos/`

**Slice sugerido posterior:** `V3.1-C-admin-archive` (diseño Prisma + API + UI confirmación).

---

### 6.8 Banners por categoría — **Cerrado Slice 10**

**Implementado**

- Modelo `CategoryEditorialBanner` (imagen GCS, título, subtítulo, CTA opcional, `isActive`, `sortOrder`).
- Admin: `AdminCategoryEditorialBannerPanel` en `/admin/categorias` → Banner; GCS `platform/banner`; ↑↓ reorder; desactivar con `AdminArchiveConfirmModal`.
- API: `CategoryEditorialBannersService`, endpoints admin/public; audit `CATEGORY_EDITORIAL_BANNER_*`.
- Público: `useCategoryHeroBanner` — editorial activo prioriza hero en `/categoria/*`; fallback `CategoryBannerItem` (eventos manual/automático).
- `CategoryBannerItem` conservado para picker de eventos destacados (sección fallback en admin).

**Archivos**

- `apps/api/src/modules/category-banners/category-editorial-banners.service.ts`
- `apps/web/components/categories/AdminCategoryEditorialBannerPanel.tsx`
- `apps/web/lib/query/useCategoryHeroBanner.ts`
- `docs/audits/V3_1_SLICE_10_CATEGORY_BANNERS_SMOKE.md`

**Fuera de alcance Slice 10**

- Home no consume editorial banners.
- Hoteles Próximamente.

---

### 6.9 Wizard productora — **Cerrado Slice 11**

**Implementado**

- Wizard 3 pasos en create + edit: `ProducerEventWizardProgress`, `wizardStep` en `ProducerEventFormFields`.
- Validación por paso (`validateProducerEventWizardStep1/2`); submit final sin cambios API.
- Rutas: `/producer/events/new`, `/producer/events/[id]/edit`.

**Estado previo (referencia)**

- Antes: una página larga con 5 secciones en `ProducerEventFormFields`:
  1. Datos básicos (título, summary, description, subcategoría)
  2. Fecha y ubicación (`EventLocationFields`, Maps)
  3. Imagen portada (GCS)
  4. Config comercial (ticketera vs publicidad)
  5. Estado (borrador / enviar a revisión en edit)
- Validación: `validateProducerEventForm`, checklist completitud, ubicación obligatoria al pasar a PENDING.
- Create siempre **DRAFT**; mutación única al guardar.
- Referencia UX: `RegisterWizard` (`components/auth/RegisterWizard.tsx`) — pasos, progreso, persistencia entre pasos.

**Riesgos**

- Romper edición de eventos existentes si se cambia shape del form sin compatibilidad.
- Validación parcial por paso vs validación final al enviar a revisión.
- Upload cover en paso 3: mantener `uploadConfig` scope producer/event.

**Recomendación**

- Stepper **solo UI** que agrupa secciones existentes; mismo payload API.
- Paso 1: básico + subcategoría. Paso 2: fecha, ubicación, entradas/condiciones. Paso 3: imágenes, resumen final, revisión, CTA publicar/enviar.
- No reescribir `producer-events-crud.service.ts` en el primer slice.

**Archivos relevantes**

- `apps/web/components/producer/events/ProducerEventCreateForm.tsx`, `ProducerEventEditForm.tsx`, `ProducerEventFormFields.tsx`
- `apps/web/lib/producer/producer-event-form.utils.ts`
- `apps/web/components/auth/RegisterWizard.tsx` (patrón)

**Doc:** `V3_1_SLICE_11_PRODUCER_EVENT_WIZARD_SMOKE.md`.

---

### 6.10 Legal al publicar evento — **Slice 12 Caso B (informativo)**

**Implementado**

- `ProducerEventPublicationLegalNotice` en paso 3 wizard — sin bloqueo backend.

**Estado actual (bloqueo duro pendiente)**

- Modelos: `LegalDocument`, `LegalDocumentVersion`, `UserLegalAcceptance` (sin `eventId`).
- Contextos: `SIGNUP`, `CHECKOUT`, `PORTAL_ACCESS`, `PROFILE_ONBOARDING` — `packages/shared/src/constants/legal-documents.ts`.
- `producer_terms`: **requerido PORTAL_ACCESS**, no SIGNUP; banner portal **no bloqueante** (`PortalLegalPendingBanner`).
- Flujo publicar evento: productor → `PENDING` → admin `APPROVED`; **sin** chequeo legal en `producer-events-crud.service.ts` ni en `admin-events.service.ts`.
- Aceptación existente: registro (SIGNUP), checkout (`/me/cart`), portales (informativo).

**Qué faltaría para aceptación al publicar**

| Requisito | Estado |
|-----------|--------|
| `userId` | ✓ modelo actual |
| `documentVersionId` | ✓ |
| `context` nuevo p.ej. `EVENT_PUBLISH` | ✗ |
| `eventId` / `publicationId` | ✗ — ampliar `UserLegalAcceptance` o tabla `EventLegalAcceptance` |
| Timestamp, IP, UA | ✓ patrón existente |
| Bloqueo si no acepta | ✗ |
| Documento `producer_terms` publicado | Pendiente contenido real (bootstrap prod) |

**Riesgos**

- Bloquear publish con legales placeholder/no aprobados bloquea productoras en prod.
- Sin `eventId`, no hay trazabilidad por publicación para disputas.
- Duplicar aceptación en cada evento vs una aceptación por productor vigente — definir con legal.

**Recomendación**

- Fase 1: contexto `EVENT_PUBLISH` + aceptación al transicionar a `PENDING` (checkbox + `POST /me/legal/accept`).
- Fase 2: columna opcional `eventId` en aceptación si se requiere por evento.
- Coordinar con publicación real de `producer_terms` (checklist V2.2 §5).

**Archivos relevantes**

- `docs/legal/LEGAL_ADMIN_MODULE.md`
- `packages/shared/src/constants/legal-documents.ts`
- `apps/api/src/modules/legal/*`, `apps/api/src/modules/producer/producer-events-crud.service.ts`
- `apps/web/components/legal/LegalFlowAcceptanceBlock.tsx`

**Slice sugerido posterior:** `V3.1-C-legal-event-publish` (tras contenido legal aprobado).

**Doc:** `V3_1_SLICE_12_EVENT_PUBLICATION_LEGAL_SMOKE.md`.

---

### 6.11 Ratings 5/5 visual + cards editoriales — **Cerrado Slice 13**

**Implementado**

- `apps/web/lib/reviews/ratingDisplay.ts` — `formatPublicRatingLabel` (escala interna 1–10 → display `/5`).
- UI pública: cards, fichas, reviews, `EventPurchaseCard` (umbral popularidad corregido a escala 10).
- `ContentCard` fase 1: badge fecha, badges sutiles, título estilo poster.
- Sin cambios DB/API/Prisma.

**Fuera de alcance Slice 13**

- JSON-LD `bestRating: 5`.
- Formulario review escala 5 visual (interno sigue 1–10).
- Cards editoriales fase 2 por vertical (§14.2 checklist).

**Doc:** `V3_1_SLICE_13_PUBLIC_CARDS_RATINGS_SMOKE.md`.

---

### 6.12 QA pre-deploy — **Cerrado Slice 14**

**Ejecutado (2026-06-14)**

| Área | Resultado |
|------|-----------|
| Migraciones V3.1 (5) | ✓ `migrate deploy` + `status` OK |
| `shared:build`, `api:lint/build`, `web:lint/build` | ✓ OK |
| `smoke:v31-stabilization` | ✓ DB OK; API HTTP SKIP (API no levantada) |
| `smoke:v31-subcategories` | ✓ DB OK; API HTTP SKIP |
| `smoke:v31-admin-archive` | ✓ OK |
| `smoke:v31-category-banners` | ✓ OK |

**Pendiente**

- QA manual browser (discovery, fichas, admin, productora, legal, maps prod).
- Re-run smokes HTTP con API + credenciales admin (opcional).
- `seed:subcategories` solo si DB sin subcategorías excursiones.

**Recomendación deploy:** listo técnicamente desde `feat/v1-s03-api-foundation` con `prisma migrate deploy` en VPS; QA manual §6 del closing doc.

**Doc:** `V3_1_PRE_DEPLOY_QA_CLOSING.md`.

---

### 6.13 Hotfix admin gastro discovery — **2026-06-14**

**Problema:** locales creados en `/admin/gastronomicos` visibles en admin pero ausentes en `/categoria/gastro`, `/explore?category=gastro` y carruseles.

**Causa:** `AdminGastroLocationsService` no garantizaba `syncPublicEvent` al activar (`updateStatus`) ni al editar perfiles `ACTIVE` sin `publicEventId` (p. ej. alta con `publish:false` o DRAFT → ACTIVE).

**Fix**

- `syncActiveProfilePublicEvent` — sync completo cuando perfil `ACTIVE`.
- `updateStatus(ACTIVE)` — siempre sincroniza (crea o restaura evento `APPROVED`).
- `update()` — si `ACTIVE` y falta `publicEventId`, fuerza sync aunque el body no toque campos de contenido.
- `public-content-availability.util.ts` — filtro gastro: ocultar si perfil vinculado ≠ `ACTIVE` (legacy sin perfil sigue visible).

**Smoke:** `smoke:v31-admin-gastro-discovery` — OK local.

**Doc:** `V3_1_HOTFIX_ADMIN_GASTRO_DISCOVERY_SMOKE.md`.

**Datos existentes prod:** reactivar local (`Suspender` → `Activar`) o guardar edición con perfil ACTIVE repara `publicEventId` sin migración.

---

## 7. Orden recomendado de implementación

### Tanda 1 — bajo riesgo (V3.1-A visual + hints)

- Fondo dark global, calendario vs filtros, scroll descripción / «Leer más».
- Hints de imagen centralizados.
- Contador caracteres (componente shared).
- Etiquetas cards sin badge genérico.
- Diagnóstico y fix maps operador (env/consola).
- Nuevas subcategorías excursiones (admin/seed).
- Copy «Lo espero» (opcional).

### Tanda 2 — funcional medio (V3.1-B contenido)

- Ampliar resumen 400/500 + clamp en cards.
- Reorden galería ↑↓.
- Links externos excursiones + ampliación gastro.
- Horarios excursiones (campos + detalle público).
- Ubicación opcional por excursión en formulario.
- Wizard productora 3 pasos (UI).
- Mejoras detalle excursión (layout bloques, sin rewrite total).

### Tanda 3 — modelo / datos (V3.1-C estructural)

- **Subcategorías múltiples** (piloto excursiones → resto verticales).
- **Admin archivar** publicaciones/locales (sin hard delete con órdenes).
- **Banners editoriales** por categoría (nuevo modelo).
- Filtros carrusel sutiles; buscador compacto (si no entraron en Tanda 1).

### Tanda 4 — legal / admin avanzado

- **Legal bloqueante al publicar evento** (con documentos publicados).
- Cards editoriales estilo poster (§14) — rollout por vertical.
- Ratings 5/5 visual (sin migración DB).
- V3.2: FAQs, Markdown seguro, cropper, SEO fino.

---

## 8. Riesgos generales

1. **Regresión discovery** — cambios en cards, subcategorías o badges afectan home, explore, categoría y carruseles cruzados cerrados en V2.
2. **Desalineación shared/API/web** — límites de caracteres o URLs validadas en un solo layer.
3. **Datos legacy** — excursiones con `startAt` placeholder, data-URLs en imágenes, contenido sin `googlePlaceId`.
4. **Operación comercial** — archivar/eliminar con órdenes/tickets activos; referidos y comisiones ligadas a eventos.
5. **Legales bootstrap en prod** — enforcement antes de publicar contenido real bloquea flujos productor.
6. **Maps cost / referrer** — clave mal restringida rompe admin y portales en prod.
7. **Scope creep** — mezclar V3.1 visual (cards Central Ticket) con migraciones estructurales en un solo slice.
8. **Rama activa** — trabajar en `feat/v1-s03-api-foundation`; no tocar `main` salvo instrucción explícita.

---

## 9. Criterios de cierre del Slice 0

- [x] Se creó `docs/audits/V3_1_FUNCTIONAL_AUDIT.md`.
- [x] No se modificó código funcional.
- [x] No se modificó Prisma.
- [x] No se generaron migraciones.
- [x] No se tocaron componentes UI.
- [x] La auditoría identifica quick wins, riesgo medio y alto riesgo.
- [x] La auditoría propone orden de implementación por tandas.
- [x] La auditoría menciona archivos/carpetas relevantes.
- [x] La auditoría deja claro que **subcategorías múltiples** y **admin delete/archivar** son cambios de mayor riesgo.
- [x] Se actualizó `docs/context/CONTEXT_PENDIENTES.md` con referencia documental al audit (sin marcar mejoras V3.1 como completadas).

---

## Referencias rápidas

| Documento | Uso |
|-----------|-----|
| `docs/dev/Yo_Te_Invito_Checklist_V3_1_Mejoras_Cliente.md` | Backlog cliente V3.1 (source of truth) |
| `docs/context/Yo_Te_Invito_Checklist_V2_2_Pendientes_Produccion.md` | Pendientes prod (pagos, legales contenido) |
| `docs/audits/MAPS_LOCATION_AUDIT.md` | Maps baseline |
| `docs/deploy/GCS_STORAGE_STRATEGY.md` | Upload imágenes |
| `docs/legal/LEGAL_ADMIN_MODULE.md` | Legales y aceptación |
| `docs/audits/PUBLIC_DISCOVERY_AUDIT.md` | Discovery V2 (no romper) |
