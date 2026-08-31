# Yo Te Invito — Checklist V3.3 Funcional y Operativa

**Rama:** `feat/v1-s03-api-foundation`  
**Auditoría:** [`V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md`](../audits/V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md)  
**Convención:** `[x]` = existe y verificado en repo · `[ ]` = pendiente V3.3

> No marcar como completadas funcionalidades nuevas de V3.3. Usar `[x] Base existente` + `[ ] Mejora V3.3` cuando aplique.

---

## Deuda V3.2 / QA previo (no es V3.3 nuevo)

- [ ] Deploy VPS commits hotfixes V3.2 (`15f2776`…`920c5d7`)
- [ ] QA prod cache HTML (`curl -I` /home, /explore, /categoria/*)
- [ ] QA prod roles discovery (USER vs GASTRO_OWNER vs PRODUCER_OWNER)
- [ ] QA prod auth resend verificación
- [x] Base existente — Hotfix horarios gastro overnight (`920c5d7`, `test:opening-hours`)
- [ ] QA prod horarios overnight en formulario gastro
- [ ] QA manual browser V3.2 (`V3_2_QA_CLOSING.md`)
- [ ] Migraciones gastro cortesías/recurrencia en VPS (si faltan)

---

## A — Arreglos pendientes

### A1 — Re-aprobación al editar descuento aprobado

- [x] Base existente — Creación descuento → `PENDING_REVIEW`
- [x] Base existente — Flujo moderación admin (approve/reject)
- [ ] Mejora V3.3 — Edición de descuento `ACTIVE`/`APPROVED` vuelve a `PENDING_REVIEW`
- [ ] Mejora V3.3 — Notificación admin/gastro al re-enviar

### A2 — Foto de perfil usuario

- [x] Base existente — `avatarUrl` soportado en `User.preferences`
- [x] Mejora V3.3 — upload GCS desde `/me/account`
- [x] Mejora V3.3 — validación HTTP(S), sin data URL
- [x] Mejora V3.3 — mostrar avatar en Navbar
- [x] Mejora V3.3 — mostrar avatar en reviews
- [x] Mejora V3.3 — mostrar avatar en perfil público `/users/[id]`
- [x] Mejora V3.3 — quitar foto
- [ ] QA manual global V3.3 — upload/reload/logout-login/mobile/error/removal

### A3 — Carruseles automáticos por subcategoría (≥5 publicaciones)

- [x] Base existente — Carruseles manuales por subcategoría (`useCategoryCarousels`, `ContentRail`)
- [x] Mejora V3.3 — Carrusel dedicado cuando subcategoría tiene **≥5** publicaciones válidas (`subcategoryRailThreshold.ts`, Etapa 1)
- [x] Mejora V3.3 — **Sin autoplay**; navegación horizontal manual
- [ ] QA manual — validar 4 vs 5 publicaciones

### A4 — Branding Scanner

- [x] Base existente — PWA scanner operativa (`apps/scanner`)
- [x] Base existente — Metadata «Yo Te Invito — Scanner»
- [ ] Mejora V3.3 — Nombre, iconos y colores alineados a marca web

### A5 — Botón instalar / descargar app

- [x] Base existente — `ScannerPwaCta` en portales producer/gastro
- [x] Base existente — `beforeinstallprompt` en scanner PWA
- [x] Base existente — Instrucciones instalación iOS/Android

### A6 — Scanner auth por username

- [x] Base existente — Login scanner email + password
- [x] Base existente — Creación scanner desde portal (email obligatorio)
- [ ] Mejora V3.3 — Login username + password sin email

### A7 — Tags + multi-subcategorías Gastro

- [x] Base existente — `ContentTag` / `EventTag`
- [x] Base existente — Multi-subcategoría gastro (`GastroSubcategoryMultiSelect`)
- [x] Base existente — Admin CRUD etiquetas `/admin/etiquetas`
- [x] Base existente — Filtro `?tag=` en explore

### A8 — Alerta descuentos vencidos

- [x] Base existente — Status `EXPIRED` en `GastroDiscount`
- [x] Base existente — Alerta dashboard gastro `EXPIRED_DISCOUNTS`
- [ ] Mejora V3.3 — Notificación in-app/email/push a gastro owner
- [ ] Mejora V3.3 — Alerta admin consolidada (opcional)

### A9 — Notificaciones usuarios

- [x] Base existente — Bandeja `/me/notifications`
- [x] Base existente — Email BullMQ + templates
- [x] Base existente — Web Push (`UserPushSubscription`)
- [x] Base existente — Kinds reviews, eventos, transferencias, gastro-follow
- [ ] Mejora V3.3 — Kinds descuentos (vencido, aprobado, rechazado, pendiente)
- [ ] Mejora V3.3 — Kinds locales gastro (aprobación)

### A10 — Cards descuentos simplificadas → ficha local

- [x] Base existente — Card con miniatura, título + local (`GastroDiscountPublicCard`)
- [x] Mejora V3.3 — Card simplificada (título + local; badge Descuento)
- [x] Mejora V3.3 — Link principal → ficha Gastro (`discount-location-href.ts`)
- [x] Mejora V3.3 — Ruta detalle descuento conservada para claim/QR (`/descuentos/[id]`)
- [ ] QA manual público/mobile

### A11 — Más de un descuento mismo día

- [x] Base existente — Sin límite diario V2.2
- [x] Base existente — Tests scan múltiples claims
- [x] **No reimplementar**

### A12 — Previews al compartir

- [x] Base existente — OG dinámico eventos, gastro, rentals, excursiones, producers
- [x] Base existente — Fallback global `brandAssets.ts`
- [x] Mejora V3.3 — Metadata dinámica descuentos (`/descuentos/[id]/layout.tsx`)
- [x] Mejora V3.3 — OG title/description/image/canonical descuentos
- [ ] QA real de preview WhatsApp/social

### A13 — Horarios local

- [x] Base existente — Horarios weekly gastro (`openingHoursWeekly`)
- [x] Base existente — Hotfix overnight `920c5d7`
- [x] Base existente — Test `test:opening-hours`
- [ ] QA/deploy prod pendiente (deuda V3.2)

### A14 — Ubicación minimapa

- [x] Base existente — GEO Georef + Google pin
- [x] Base existente — `EventLocationModal` lazy embed en fichas
- [ ] Mejora V3.3 — Minimapa inline en ficha/card (si se confirma diseño)

### A15 — Mejorar botones Gastro

- [x] Base existente — CTAs WhatsApp, follow, ubicación, descuentos en ficha
- [x] Mejora V3.3 — Jerarquía visual CTA (`GastroPublicActionCard`, primario/secundario/terciario)
- [ ] QA manual mobile/desktop

### A16 — Códigos cortos ingreso manual QR

- [x] Base existente — Payload seguro `yti:gastro-discount:v1:…`
- [x] Base existente — Input manual scanner (payload completo)
- [x] Base existente — `shortTicketCode` solo para listado PDF tickets
- [ ] Mejora V3.3 — Código corto human-readable para descuentos (lookup server)

### A17 — Acceso directo cámara Scanner

- [x] Base existente — Flujo setup → scan con persistencia LS
- [x] Base existente — Modo cámara vs manual
- [ ] Mejora V3.3 — Atajo directo a cámara (skip setup cuando aplica)

### A18 — Valoraciones menú desplegable

- [x] Base existente — `RatingInput` caritas 1–5 (V3.2)
- [ ] Mejora V3.3 — Cambiar a dropdown/select (si se confirma vs caritas)

### A19 — Diseño botones subcategorías

- [x] Base existente — `SubcategoryRail` chips scroll
- [x] Mejora V3.3 — Rediseño visual chips (`SubcategoryFilterChip`)
- [ ] QA responsive manual

### A20 — Modales centrados

- [x] Base existente — `Modal.tsx` centrado con portal
- [x] Base existente — Drawers/sheets laterales intencionales (sin cambio)
- [x] Mejora V3.3 — Corrección dialogs convencionales centrados en mobile
- [ ] Smoke visual mobile pendiente

### A21 — Navbar mobile Home + Explore

- [x] Base existente — Explore en `MobilePublicNavDrawer`
- [x] Base existente — Categorías gateway en drawer
- [x] Mejora V3.3 — Home (`/home`) en drawer mobile
- [x] Mejora V3.3 — Explore accesible en drawer
- [x] Mejora V3.3 — Categorías conservadas en drawer
- [x] Mejora V3.3 — Botón Home visible (`NavbarHomeButton` todos viewports)
- [ ] QA manual mobile

### A22 — Scroll imágenes mobile

- [x] Base existente — Galerías horizontales (`GastroGallerySection`, `EventGallerySection`, rentals)
- [x] Mejora V3.3 — Mejoras técnicas touch scroll (`horizontalScrollClasses.ts`, galerías/carruseles)
- [ ] QA touch real mobile

### A23 — Botón «Nuevo Scanner» mobile

- [x] Base existente — `ScannerUsersPanel` con botón crear
- [x] Base existente — Rutas `/producer/scanners`, `/gastro/scanners`
- [ ] Mejora V3.3 — Accesibilidad botón en viewport mobile (sticky/posición)

### A24 — Vencidos: archivo/eliminación

- [x] Base existente — Status `EXPIRED`, `CANCELLED`
- [x] Base existente — Métricas y claims conservados en DB
- [ ] Mejora V3.3 — Archivo soft sin borrar trazabilidad
- [ ] Mejora V3.3 — UI gestión vencidos portal + admin

---

## B — Mejoras adicionales

### B1 — Excursiones → Actividades (público)

- [x] Base existente — Vertical `excursion` en DB/API
- [x] Base existente — Rutas `/excursiones`, `/categoria/excursion` (legacy preservadas)
- [x] Mejora V3.3 — Copy público «Actividades» (`excursionPublicCopy.ts`)
- [x] Mejora V3.3 — Identifier técnico `excursion` preservado
- [ ] QA completo de labels públicos

### B2 — Cupones QR Actividades

- [x] Base existente — Motor gastro descuentos QR (referencia)
- [ ] Mejora V3.3 — Cupones QR para `category=excursion`
- [ ] Mejora V3.3 — Scanner validación actividades
- [ ] Mejora V3.3 — Diseño dominio compartido vs vertical

---

## C — Mejoras Admin

### C1 — Admin crea descuentos para restaurantes

- [x] Base existente — Moderación `GET /admin/gastronomicos/pending-discounts`
- [x] Base existente — Approve/reject/status descuentos admin
- [ ] Mejora V3.3 — `POST` admin crear descuento on-behalf
- [ ] Mejora V3.3 — Distinción `creado_por_admin` vs `creado_por_gastro`

### C2 — Campañas email / WhatsApp

- [x] Base existente — SMTP DonWeb, BullMQ, `MailProvider`
- [x] Base existente — Templates email transaccionales
- [x] Base existente — `NotificationDeliveryLog`
- [ ] Mejora V3.3 — UI campañas admin (segmentación)
- [ ] Mejora V3.3 — **WhatsApp — NUEVO / REQUIERE PROVEEDOR EXTERNO**

---

## D — Editor visual QR descuentos

- [x] Base existente — Ticket Canvas Studio (`TicketTemplate`, QR zone JSON)
- [ ] Mejora V3.3 — Editor plantilla visual para descuentos QR
- [ ] Mejora V3.3 — Modelo/config persistencia plantilla descuento

---

## E — Gastronómico

### E1 — Aprobación locales nuevos

- [x] Base existente — `ProfileStatus` enum (PENDING, ACTIVE, …)
- [x] Base existente — Registro gastro → perfil `ACTIVE` inmediato
- [ ] Mejora V3.3 — Nuevos locales `PENDING` hasta aprobación admin
- [ ] Mejora V3.3 — Notificaciones aprobación/rechazo local

### E2 — Multi-local por cuenta

- [x] Base existente — `UserGastroMembership` N:M a nivel modelo
- [x] Base existente — Un local operativo por owner (`createMyLocal` bloquea 2º)
- [ ] Mejora V3.3 — Gestión múltiples locales (franquicia/sucursales)
- [ ] Mejora V3.3 — Scanners y descuentos por local
- [ ] Mejora V3.3 — Modelo organización o `GastroProfile` = local

### E3 — Scanner username sin email

- [x] Base existente — Scanner con email + `emailVerified` auto al crear desde portal
- [ ] Mejora V3.3 — Username sin email obligatorio (ver A6)

---

## F — Auditoría económica / conciliación

- [x] Base existente — `GastroDiscountClaim`, `GastroDiscountValidation`
- [x] Base existente — Métricas por descuento (`GET .../summary`)
- [x] Base existente — `AuditLog` operativo
- [ ] Mejora V3.3 — Reporte conciliación admin/gastro
- [ ] Mejora V3.3 — Trazabilidad campaña → cupón → claim → validación → liquidación
- [ ] Mejora V3.3 — Modelo settlement (sin mezclar ticketera/referidos)

---

## Infraestructura transversal (verificado, no V3.3)

- [x] Monorepo `apps/web`, `apps/api`, `apps/scanner`, `packages/shared`
- [x] Tenant isolation + RBAC
- [x] Pago DEMO checkout
- [x] Scanner PWA offline/sync
- [x] Deep Delete admin
- [x] Reviews V2 + disputas
- [x] Portal usuario `/me/*`
- [x] Category discovery V3.2 + coming soon por rol

---

## Context updates recommended after Slice 0

Ver sección final de [`V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md`](../audits/V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md).
