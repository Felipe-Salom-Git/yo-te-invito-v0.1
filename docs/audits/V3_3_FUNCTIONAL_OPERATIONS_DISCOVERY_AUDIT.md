# V3.3 — Auditoría funcional y operativa (Discovery)

**Fecha:** 2026-08-30  
**Rama auditada:** `feat/v1-s03-api-foundation`  
**HEAD local al auditar:** `b6a1370` (contexto operativo referencia `920c5d7` hotfixes V3.2)  
**Alcance:** inspección + contraste + clasificación. **Sin cambios de código productivo.**

---

## 1. Resumen ejecutivo

Yo Te Invito llega a V3.3 con una base sólida en descuentos Gastro QR (V2.2), Scanner PWA, notificaciones multi-canal, discovery V3.2, tags/subcategorías gastro, GEO/maps y Ticket Canvas Studio. **Varios ítems del backlog del cliente ya están resueltos** y no deben reimplementarse (multi-subcategorías, tags, más de un descuento/día, infraestructura de notificaciones, hotfix horarios overnight, botón instalar PWA scanner desde portales).

Los gaps más relevantes para V3.3 se agrupan en:

1. **Flujos operativos Gastro** — re-aprobación al editar descuentos activos, alertas/archivo de vencidos, cards que apunten a ficha del local, admin que cree descuentos, aprobación de nuevos locales.
2. **Scanner V3** — branding, username sin email, acceso directo a cámara, códigos manuales cortos (sin debilitar QR seguro).
3. **UX pública mobile** — navbar Home/Explore, modales centrados, carruseles automáticos, previews de share, minimapa en fichas.
4. **Dominios nuevos** — cupones QR para Actividades, conciliación económica, campañas WhatsApp, QR Studio para descuentos, multi-local gastro.

**Deuda V3.2 previa (separada):** deploy/QA prod de hotfixes `15f2776`…`920c5d7`, QA browser V3.2, migraciones gastro cortesías en VPS si faltan.

---

## 2. Mapa de requerimientos

| ID | Requerimiento | Estado | Backend | Frontend | DB | Riesgo | Observación |
| -- | ------------- | ------ | ------- | -------- | -- | ------ | ----------- |
| **A1** | Editar descuento aprobado → pendiente re-aprobación | 🟡 PARCIAL | `gastro-portal-discounts.service` `updateMyDiscount` no cambia `status` | `GastroDiscountForm` edita sin re-enviar a revisión | Enum `PENDING_REVIEW` existe | Medio | Creación sí va a `PENDING_REVIEW`; edición de `ACTIVE`/`APPROVED` conserva estado |
| **A2** | Foto de perfil usuario | 🟡 PARCIAL | `me-account.service` persiste `avatarUrl` en `User.preferences` JSON | Sin UI clara en `/me/account` para subir foto; `UserReviewerAvatar` muestra si existe | Sin columna dedicada | Bajo | Referrers tienen `avatarUrl` en perfil; usuario estándar usa preferences |
| **A3** | Carruseles automáticos por subcategoría (≥5 ítems) | 🔴 NUEVO | `useCategoryCarousels` arma secciones; sin autoplay | `ContentRail` + scroll manual; sin umbral 5 | N/A | Bajo | No hay lógica `length >= 5` ni rotación automática |
| **A4** | Renombrar/rebrand Scanner | 🟡 PARCIAL | N/A | `apps/scanner/manifest.json` → `short_name: Scanner`; metadata genérica | N/A | Bajo | Iconos SVG propios; no alineado a marca web `/brand/*` |
| **A5** | Botón instalar/descargar app | ✅ IMPLEMENTADO | N/A | `ScannerPwaCta` (portales) + `use-pwa-install` (scanner PWA) | N/A | Bajo | `beforeinstallprompt` + instrucciones iOS/Android |
| **A6** | Scanner auth por username | 🔴 NUEVO 🟣 | `User.email` obligatorio + unique; `createScannerUserBodySchema` exige email | `ScannerLoginForm` campo email | Requiere `username` o email opcional | Alto | Cruza con **E3** |
| **A7** | Tags + multi-subcategorías Gastro | ✅ IMPLEMENTADO | `syncGastroPublicEventTags`, `resolveValidatedGastroSubcategories`, `EventSubcategory` | `GastroSubcategoryMultiSelect`, `ContentTagChips` | `ContentTag`, `EventTag`, `EventSubcategory` | Bajo | **No duplicar** — cerrado V3.1 Etapa 4 + admin gastro locations |
| **A8** | Alerta descuentos vencidos | 🟡 PARCIAL | `gastro-dashboard.service` alerta `EXPIRED_DISCOUNTS` | `GastroDashboardClient` muestra alerta portal | `GastroDiscountStatus.EXPIRED` | Medio | Sin notificación in-app/email/push al usuario ni cron dedicado |
| **A9** | Notificaciones usuarios | ✅ IMPLEMENTADO 🟡 | `UserNotificationsService.deliver`, BullMQ email, WebPush | `/me/notifications`, preferencias push | `UserNotification`, `NotificationDeliveryLog` | Medio | Falta mapear kinds V3.3 (vencido, aprobación local, etc.) |
| **A10** | Cards descuentos simplificadas → ficha local | 🟡 PARCIAL 🔵 | API lista `locationName` | `GastroDiscountPublicCard` título+local OK; **href `/descuentos/:id`** no restaurante | N/A | Bajo | V3.2 simplificó card; falta CTA a `/gastronomicos/[id]` o `/restaurants/[eventId]` |
| **A11** | Más de un descuento mismo día | ✅ IMPLEMENTADO | V2.2 eliminó límite diario; tests scan | Claim múltiple permitido | `@@unique([discountId, email])` por descuento | Bajo | **No duplicar** — ver `GASTRO_QR_COURTESIES_AUDIT.md` § V2.2 |
| **A12** | Mejorar previews al compartir | 🟡 PARCIAL | N/A | `generateMetadata` en eventos, gastro, rentals, excursiones, producers, hoteles; **sin layout OG en `/descuentos/[id]`** | N/A | Medio | Fallback global `brandAssets.ts` para rutas sin metadata dinámica |
| **A13** | Corregir horarios local | ✅ IMPLEMENTADO 🟠 | `920c5d7` overnight; `test:opening-hours` | `GastroLocalForm` errores bajo horarios | JSON en `GastroProfile` | Bajo | **No duplicar fix** — pendiente QA/deploy prod |
| **A14** | Ubicación minimapa | 🟡 PARCIAL | GEO completo | `EventLocationModal` lazy embed en fichas; no minimapa en cards | `geoLat`/`geoLng` en perfiles | Bajo | Reutilizar modal/embed; coste bajo en detalle |
| **A15** | Mejorar botones Gastro | 🔵 SOLO UX | N/A | Múltiples CTAs: WhatsApp, follow, descuentos, ubicación en `GastroPublicDetailContent` | N/A | Bajo | Auditoría visual pendiente; sin cambio de contrato |
| **A16** | Códigos cortos ingreso manual QR | 🟡 PARCIAL | Payload `yti:gastro-discount:v1:id:token` | Scanner manual acepta payload completo; `shortTicketCode` solo tickets PDF | N/A | Medio | Agregar human-readable sin reemplazar token seguro |
| **A17** | Acceso directo QR/cámara Scanner | 🟡 PARCIAL | N/A | Flujo `setup` → `scan`; `DoorScannerClient` persiste pantalla en LS | N/A | Medio | Requiere selección target antes de cámara |
| **A18** | Valoraciones con menú desplegable | 🔴 NUEVO 🔵 | N/A | `ReviewForm` + `RatingInput` caritas 1–5 (grid botones) | N/A | Bajo | Cambiar `RatingInput` o wrapper en formulario público |
| **A19** | Diseño botones subcategorías | 🔵 SOLO UX | N/A | `SubcategoryFilterChip` / `SubcategoryCard` chips scroll | N/A | Bajo | |
| **A20** | Modales centrados (público + portales) | 🟡 PARCIAL 🔵 | N/A | `Modal.tsx` centrado; varios usan `items-end` mobile (bottom sheet) | N/A | Medio | Ver §17 — inventario mixto intencional/riesgo |
| **A21** | Navbar mobile Home + Explore | 🟡 PARCIAL 🔵 | N/A | Explore en drawer; Home como «Inicio/Categorías» (`/categorias`); `NavbarHomeButton` **solo desktop** | N/A | Bajo | Falta acceso explícito `/home` en mobile drawer |
| **A22** | Scroll imágenes mobile | 🟡 PARCIAL 🟠 | N/A | `overflow-x-auto` en galerías/rails; QA manual pendiente | N/A | Medio | Patrones existen; validar touch en eventos/gastro/rentals/excursiones |
| **A23** | Botón «Nuevo Scanner» mobile | 🟡 PARCIAL 🔵 | API create OK | `ScannerUsersPanel` botón en header; tabla desktop; modal create usa `Modal` centrado | N/A | Bajo | Verificar sticky/fixed en `/gastro/scanners` y `/producer/scanners` mobile |
| **A24** | Vencidos: eliminación/archivo | 🟡 PARCIAL 🟣 | Status `EXPIRED`/`CANCELLED`; metrics conservan claims | Portal lista vencidos; sin archivo soft-delete dedicado | Cascade claims→validations | Alto | No borrado físico; definir `ARCHIVED` o status + filtros |
| **B1** | Excursiones → Actividades (público) | 🟡 PARCIAL 🔵 | `Event.category=excursion` en DB | Labels «Excursiones» en nav/gateway | Mantener `excursion` interno | Medio | Opción recomendada: solo copy/SEO público |
| **B2** | Cupones QR Actividades | 🔴 NUEVO 🟣 | Motor gastro reusable | Sin UI excursión | Generalizar o wrapper | Alto | Evaluar motor compartido vs `ExcursionCoupon` |
| **C1** | Admin crea descuentos para restaurantes | 🟡 PARCIAL | Admin modera (`pending-discounts`, approve/reject); **sin POST create admin** | Admin detalle descuento por local | Sin `createdByAdmin` flag | Medio | Distinguir `creado_por_gastro` vs `creado_por_admin` |
| **C2** | Campañas email/WhatsApp admin | 🟡 PARCIAL 🔴 | Email: SMTP, BullMQ, templates, `NotificationDeliveryLog` | Sin UI campañas masivas | N/A | Alto | **WhatsApp: NUEVO / REQUIERE PROVEEDOR EXTERNO** |
| **D1** | Editor visual QR descuentos | 🔴 NUEVO | `TicketTemplate` + QR zone reutilizable | `TicketStudioClient` referencia | Posible `DiscountTemplate` | Alto | No es integración Canva.com |
| **E1** | Aprobación locales gastro nuevos | 🔴 NUEVO 🟣 | `ProfileRegistrationService.createGastroActive` → `status: ACTIVE` | Registro wizard activa perfil | `ProfileStatus` enum listo | Alto | Diferenciar aprobación cuenta vs cada local |
| **E2** | Multi-local por cuenta gastro | 🔴 NUEVO 🟣 | `getOwnedProfile` singular; `createMyLocal` bloquea 2º local | Portal asume un local | Modelo 1:1 user↔profile activo | **Alto** | Ver § análisis E2 |
| **E3** | Scanner username sin email | 🔴 NUEVO 🟣 | `User.email` required unique; scanner crea User con email | Login email | Migración o username field | Alto | = A6 |
| **F1** | Conciliación cupones admin/gastro | 🔴 NUEVO 🟣 | Métricas claims/validations; sin liquidación | Dashboard métricas descuento | Sin `Settlement` model | **Alto** | No mezclar con payouts ticketera/referidos |

**Leyenda estados:** ✅ IMPLEMENTADO · 🟡 PARCIAL · 🔴 NUEVO · 🟣 REQUIERE MIGRACIÓN/MODELO · 🔵 SOLO UX · 🟠 QA/DEPLOY PENDIENTE · ❓ DECISIÓN DE PRODUCTO

---

## 3. Funcionalidades ya existentes (no reimplementar)

| ID | Evidencia repo |
| -- | -------------- |
| A5 | `ScannerPwaCta.tsx`, `apps/scanner/hooks/use-pwa-install.ts` |
| A7 | `GastroSubcategoryMultiSelect`, `ContentTag`/`EventTag`, `docs/audits/V3_1_STAGE_4_TAGS_CLOSING.md` |
| A11 | `GASTRO_QR_COURTESIES_AUDIT.md` § V2.2; sin límite diario en scanner |
| A13 | Commit `920c5d7`, `test:opening-hours`, `V3_2_HOTFIX_GASTRO_OVERNIGHT_HOURS_CLOSING.md` |
| A9 (base) | `UserNotificationsService`, kinds reviews/events/transfers/gastro-follow |
| Maps base | `EventLocationModal`, `AddressMapPicker`, `GEO_MAPS_STAGE_CLOSING.md` |
| Scanner operativo | `apps/scanner`, `ScannerAccount`, smokes V3.1 Etapas 5–6 |
| Ticket Studio | `TicketCanvasStudio`, `TicketTemplate` model |

---

## 4. Funcionalidades parciales — qué falta

| Área | Existe | Falta V3.3 |
| ---- | ------ | ----------- |
| A1 Re-aprobación descuentos | Create → `PENDING_REVIEW` | Al editar campos material en `ACTIVE`/`APPROVED` → reset status + notificar admin |
| A2 Avatar usuario | `preferences.avatarUrl` API | Upload GCS + UI `/me/account` + mostrar en reseñas/navbar |
| A8 Alertas vencidos | Dashboard gastro `EXPIRED_DISCOUNTS` | Notificación usuario/admin; posible cron expiry → status |
| A10 Cards descuentos | Card simplificada V3.2 | `href` a ficha restaurante; opcional quitar beneficio/fechas en card |
| A12 Share | OG por entidad principal | `generateMetadata` descuentos; imagen por publicación consistente |
| A16 Código corto | Manual input payload largo | Alias corto lookup server-side manteniendo token |
| A17 Cámara directa | Setup + persistencia LS | Skip setup si un solo target; deep link `/door?mode=camera` |
| A20 Modales | Mayoría centrados desktop | Auditar/mobile bottom sheets no deseados en público |
| A21 Nav mobile | Explore + categorías | Entrada `/home` explícita; icono home visible mobile |
| A24 Archivo vencidos | Status EXPIRED | Archivar sin borrar claims/scans; UI filtro archivo |
| C1 Admin descuentos | Moderación completa | Endpoint create-on-behalf + auditoría actor |
| C2 Campañas | Email transaccional | UI segmentación + WhatsApp provider |
| B1 Actividades | Rutas `/excursiones` | Copy «Actividades» en UI/SEO/emails |

---

## 5. Funcionalidades nuevas (por dominio)

### Público / Discovery
- A3 Carruseles automáticos con umbral 5
- A18 Reviews dropdown (si se confirma vs caritas actuales)

### Scanner
- A4 Branding completo
- A6/E3 Username auth
- A16 Código corto manual
- A17 Atajo cámara

### Gastro / Descuentos
- A1 Re-aprobación en edición
- A24 Archivo vencidos con trazabilidad
- C1 Admin crea descuentos
- D1 QR Studio descuentos
- E1 Aprobación locales
- E2 Multi-local

### Actividades
- B2 Cupones QR excursiones

### Admin / Comunicaciones
- C2 Campañas email masivas + WhatsApp

### Economía
- F1 Conciliación cupones (emisión → claim → validación → liquidación)

---

## 6. Cambios UX-only

- A15 Botones gastro (jerarquía visual)
- A19 Subcategorías chips/cards
- A20 Centrado modales (CSS/layout)
- A21 Navbar mobile Home
- A22 Scroll galerías mobile (QA + ajustes CSS)
- A23 Posición botón Nuevo Scanner mobile
- B1 Renombre público Excursiones → Actividades

---

## 7. Cambios que requieren backend

- A1 Status transition on discount update
- A8/A9 Notification kinds + schedulers
- A16 Short code lookup endpoint
- C1 Admin discount creation API
- C2 Campaign send API (email); WhatsApp integration
- E1 Gastro profile `PENDING` on register + admin approve endpoints
- E2 Multi-local ownership resolution in gastro/scanner/discount services
- E3/A6 Auth username path
- B2 Activity coupon domain
- F1 Reconciliation reports API

---

## 8. Cambios que requieren Prisma/migraciones (sin diseñar aún)

| Necesidad | Posibles campos/modelos |
| --------- | ---------------------- |
| E2 Multi-local | `GastroOrganization` o reutilizar `GastroProfile` como local + membership N:M |
| E3 Username scanner | `User.username` unique nullable o tabla credencial |
| C1 Actor descuento | `GastroDiscount.createdByUserId`, `createdByRole` |
| A24 Archivo | `GastroDiscountStatus.ARCHIVED` o `archivedAt` |
| D1 QR Studio | `DiscountTemplate` (JSON similar `TicketTemplate`) |
| B2 Cupones actividad | Generalizar `Coupon` + `CouponClaim` o extensión `Event` |
| F1 Conciliación | `CouponSettlement`, `SettlementLine`, `RedemptionCampaign` |
| C2 WhatsApp | `WhatsAppOptIn`, `Campaign`, `CampaignDelivery` |
| A2 Avatar | Columna `User.avatarUrl` vs mantener JSON preferences |

---

## 9. Auditoría modelos Prisma

| Dominio | Modelo actual | Sirve V3.3 | Limitación |
| ------- | ------------- | ---------- | ---------- |
| Usuario | `User` | Parcial | `email` obligatorio; avatar en `preferences` JSON |
| Local gastro | `GastroProfile` | Parcial | 1 perfil activo por membership; no organización |
| Membresía | `UserGastroMembership` | Parcial | N:M user↔profile posible pero servicios asumen 1 owned |
| Scanner | `ScannerAccount` | Sí | Scope por `parentProfileId`; multi-local impacta targets |
| Evento público | `Event` | Sí | Gastro sync `publicEventId`; excursion = actividad |
| Subcategorías | `ContentSubcategory`, `EventSubcategory` | Sí | Multi-subcategoría gastro/excursión |
| Tags | `ContentTag`, `EventTag` | Sí | Gastro público sincroniza tags |
| Descuento | `GastroDiscount` | Sí | Sin actor creator; sin template visual |
| Claim | `GastroDiscountClaim` | Sí | Unique por discount+email; trazabilidad scan |
| Cortesía | `GastroCourtesyCampaign` | Sí | Patrón reusable para campañas |
| Validación | `GastroDiscountValidation` | Sí | Link claim; base conciliación |
| Auditoría | `AuditLog` | Sí | Acciones scanner/admin; extensible |
| Notificación | `UserNotification` | Sí | Falta kinds V3.3 |
| Push | `UserPushSubscription` | Sí | |
| Entrega email | `NotificationDeliveryLog` | Sí | Base campañas email |
| Ticket diseño | `TicketTemplate` | Sí (D1) | QR zone JSON reutilizable |
| Pagos | `Payment`, `Payout` | No mezclar | Ticketera/referidos separados |
| Comisión referido | `ReferralPaymentRequest` | No mezclar | Liquidación manual externa |

**Modelos adicionales relevantes:** `ScannerAccount`, `GastroContent`, `CategoryEditorialBanner`, `Review`, `ReviewDisputeRequest`, `LegalDocument`, `RentalLocation`, `ExcursionOperator`, `ProducerProfile`.

---

## 10. Auditoría backend (mapa técnico)

### Gastro / Descuentos
| Pieza | Ubicación |
| ----- | --------- |
| Module | `apps/api/src/modules/gastro/` |
| Controllers | `gastro.controller.ts`, admin en `admin.controller.ts` |
| Services | `gastro-portal-discounts.service.ts`, `gastro-discount-metrics.service.ts`, `gastro-courtesy-discounts.service.ts`, `admin-gastro.service.ts` |
| Scanner validate | `apps/api/src/scanner/scanner-gastro-discount.service.ts` |
| Shared schemas | `packages/shared/src/schemas/gastro-discounts.ts`, `gastro-courtesy-discounts.ts`, `gastro-discount-expiry.ts` |
| Endpoints clave | `POST /gastro/discounts`, `PATCH /gastro/discounts/:id`, `GET .../summary`, `PATCH .../status`, `POST /public/gastro-discounts/:id/claim`, `POST /scanner/gastro-discounts/validate` |
| Auth | `GASTRO_OWNER`, `ADMIN`; scanner `SCANNER` scoped |
| Tests | `test:gastro-discount-qr`, `test:gastro-discount-scan`, `test:gastro-discount-expiry` |

### Notificaciones
| Pieza | Ubicación |
| ----- | --------- |
| Service | `user-notifications.service.ts` |
| Deliver | IN_APP + EMAIL (BullMQ) + PUSH (`WebPushService`) |
| Kinds | Prisma enum `NotificationKind` (24 valores); sin gastro discount lifecycle |
| Smokes | `smoke:notifications` |

### Scanner
| Pieza | Ubicación |
| ----- | --------- |
| API | `apps/api/src/scanner/scanner.controller.ts` |
| Accounts | `modules/scanner-accounts/` — producer + gastro controllers |
| PWA | `apps/scanner/` — `DoorScannerClient`, offline sync |

### Perfiles / Registro
| Pieza | Ubicación |
| ----- | --------- |
| Registro | `profile-registration.service.ts` — gastro ACTIVE inmediato |
| Admin gastro CRUD | `admin-gastro-locations.service.ts` |

### GEO
| Pieza | Ubicación |
| ----- | --------- |
| Module | `modules/geo/` — provinces, localities, resolve-address |

---

## 11. Auditoría frontend (mapa técnico)

| Requerimiento | Routes | Components | Hooks/Repos |
| ------------- | ------ | ---------- | ----------- |
| Descuentos público | `/descuentos/[id]`, `/categoria/gastro` | `GastroDiscountPublicCard`, `GastroDiscountsRail` | `useGastroPublishedDiscounts` |
| Portal gastro | `/gastro/descuentos/*` | `GastroDiscountForm`, `GastroDiscountDetailContent` | `repos.gastro` |
| Admin gastro | `/admin/gastronomicos/*` | `AdminGastroLocations*` | `admin-gastro.ts` |
| Scanner portales | `/producer/scanners`, `/gastro/scanners` | `ScannerUsersPanel`, `ScannerPwaCta` | `scanner-accounts.ts` |
| Navbar mobile | global | `MobilePublicNavDrawer`, `NavbarHomeButton` | `publicNavConfig.ts` |
| Category landing | `/categoria/[category]` | `CategoryLandingPage`, `SubcategoryRail`, `ContentRail` | `useCategoryCarousels` |
| Reviews | fichas públicas | `ReviewForm`, `RatingInput` | `reviews` query keys |
| Maps | fichas | `EventLocationModal`, `AddressMapPicker` | `GeoRepo` |
| Share SEO | layouts por entidad | `generateMetadata` en `app/(public)/*/layout.tsx` | `brandAssets.ts` |
| Ticket Studio | `/producer/events/.../design` | `TicketStudioClient` | `ticketTemplates` |

---

## 12. Auditoría Scanner (flujo real)

```
Login (email+password, JWT)
  → GET /scanner/account
  → GET /scanner/scan-targets (eventos + descuentos gastro scoped)
  → Pantalla SETUP: elegir evento/occurrence O descuento gastro
  → Pantalla SCAN: cámara QR o input manual (payload completo)
  → POST /scanner/scan | POST /scanner/gastro-discounts/validate
  → Modal resultado (sin auto-cierre)
  → Offline: snapshot + queue sync
```

**Encaje V3.3:**
- **A4:** `manifest.json`, `layout.tsx`, iconos
- **A5:** install prompt en scanner app
- **A6/E3:** `ScannerLoginForm`, `scanner-accounts.service` create user
- **A16:** `DoorScannerClient` placeholder manual; extender con short code
- **A17:** reducir pasos setup → scan; localStorage `scanner:screen`
- **A23:** CTA en portales web, no en scanner app

---

## 13. Auditoría notificaciones — reutilización V3.3

**Motor existente:** `UserNotificationsService.deliver({ kind, channels, referenceKey, ... })` con deduplicación, email template id, push.

**Kinds sugeridos (NO implementar en Slice 0):**

| Caso | Canal sugerido |
| ---- | -------------- |
| Descuento vencido (gastro) | IN_APP + EMAIL |
| Descuento pendiente re-aprobación (admin) | IN_APP (admin dashboard ya tiene cola) |
| Descuento aprobado/rechazado (gastro) | IN_APP + EMAIL |
| Local pendiente/aprobado/rechazado | IN_APP + EMAIL |
| Conciliación pendiente/confirmada | IN_APP |

---

## 14. Auditoría modales / mobile

| Patrón | Componentes | Notas |
| ------ | ----------- | ----- |
| Centrado `fixed inset-0 flex items-center` | `Modal.tsx`, `EventLocationModal`, `GastroPromoRequestModal` | OK |
| Bottom sheet mobile `items-end` | `ContentPreviewModal`, `ReviewReplyModal`, `AdminDeepDeleteModal`, `PublicDescriptionBlock` | Intencional en algunos; validar con cliente |
| Drawer lateral | `MobilePublicNavDrawer`, `SideSheet` | OK mobile |
| Portal body | `createPortal(..., document.body)` | Navbar user menu, drawers |

**Riesgo:** modales dentro de contenedores con `transform`/`overflow:hidden` del padre — priorizar portal como `Modal.tsx`.

---

## 15. Auditoría sharing

| Ruta | Metadata dinámica | Imagen OG |
| ---- | ----------------- | --------- |
| `/events/[id]` | Sí | cover evento |
| `/gastronomicos/[id]`, `/restaurants/[id]` | Sí | banner gastro |
| `/rentals/[id]`, `/excursiones/[id]` | Sí | cover |
| `/producers/[id]` | Sí | cover |
| `/descuentos/[id]` | **No** (client page) | Fallback global |
| `/home`, `/` | Sí estático | `og-logo3-black-v2.png` |

---

## 16. Riesgos arquitectónicos

1. **E2 Multi-local** impacta scanner scope, descuentos, dashboard, RBAC, deep delete — mayor riesgo V3.3.
2. **Generalizar cupones (B2 + F1)** sin acoplar a ticketera requiere diseño de dominio compartido.
3. **Username scanner (A6)** choca con `User.email` unique y verificación email en web.
4. **Re-aprobación A1** debe invalidar QR activos o versionar claims — decisión de producto.
5. **WhatsApp C2** dependencia externa + consentimiento legal.
6. **No borrado físico A24/F1** — integridad histórica vs UX listados.

---

## 17. Dependencias entre funcionalidades

```
E2 Multi-local Gastro
  → E1 Aprobación por local
  → Scanner ownership (parentProfileId)
  → Descuentos (gastroProfileId)
  → A23 Scanners por local
  → C1 Admin crea descuento (elegir local)
  → F1 Conciliación por local/campaña

A1 Re-aprobación descuento
  → A9 Notificaciones admin/gastro
  → A8 Alertas vencidos (si edit extiende vigencia)

B2 Cupones Actividades
  → B1 Rename público
  → A16 Código corto (compartido)
  → D1 QR Studio (plantilla compartida)
  → F1 Conciliación

C2 Campañas
  → C1 contenido a promocionar
  → Opt-in legal
```

---

## 18. Decisiones de producto requeridas

1. **A1:** ¿Qué campos de edición disparan re-aprobación? ¿Claims activos siguen válidos durante revisión?
2. **A6/E3:** ¿Username global unique o por tenant? ¿Email opcional para scanner?
3. **A10:** ¿Card descuento va a ficha local o mantiene detalle descuento como secundario?
4. **A18:** ¿Reemplazar caritas por dropdown o solo en mobile?
5. **A24:** ¿Archivar vs status EXPIRED? ¿Retención claims en archivo?
6. **B1:** ¿Solo copy «Actividades» manteniendo `excursion` en DB/API?
7. **B2:** ¿Mismo flujo claim email que gastro o simplificado?
8. **C1:** ¿Admin crea descuento ya aprobado o siempre PENDING_REVIEW?
9. **C2 WhatsApp:** Proveedor (Twilio, Meta Cloud API, etc.) y opt-in.
10. **E1:** ¿Aprobar cuenta gastro, cada local, o ambos?
11. **E2:** ¿Franquicia = organización con N locales o N perfiles bajo un owner?
12. **F1:** ¿Qué es «cobrado» vs «escaneado»? ¿Precio cupón dónde se define?
13. **D1:** ¿Un template por descuento o por local/campaña?

---

## 19. Roadmap recomendado

| Etapa | Alcance | Notas |
| ----- | ------- | ----- |
| **0** | Esta auditoría + checklist | Actual |
| **1 — UX pública/mobile** | A10, A20, A21, A22, A19, B1 copy | Bajo riesgo, sin migraciones |
| **2 — Perfil usuario** | A2 avatar upload | Preferences o columna |
| **3 — Scanner V3** | A4, A5 polish, A16, A17, A6/E3 | Secuencial: branding → UX → auth |
| **4 — Gastro multi-local + aprobación** | E1, E2 | Bloque alto impacto |
| **5 — Descuentos V3** | A1, A8, A24, C1 | Tras o en paralelo limitado con Etapa 4 |
| **6 — QR Studio** | D1 | Tras estabilizar descuentos |
| **7 — Actividades + cupones** | B1, B2 | Reutilizar motor |
| **8 — Campañas Email/WhatsApp** | C2 | WhatsApp tras proveedor |
| **9 — Auditoría económica** | F1 | Requiere modelo + UI reportes |

*Ajuste vs hipótesis inicial:* subir **A1 + A8** a Etapa 5 temprana si E2 se retrasa; **A13** solo QA/deploy (no etapa dev).

---

## 20. Propuesta de slices (nombre + alcance)

| Slice | Nombre | Alcance |
| ----- | ------ | ------- |
| 1 | `v33-public-discount-cards` | A10 cards → ficha local |
| 2 | `v33-mobile-nav-home` | A21 Home en drawer + navbar |
| 3 | `v33-modal-centering-audit` | A20 inventario + fixes puntuales |
| 4 | `v33-share-og-discounts` | A12 metadata descuentos |
| 5 | `v33-discount-reapproval` | A1 backend + notifs |
| 6 | `v33-expired-discounts-ops` | A8 + A24 archivo |
| 7 | `v33-user-avatar` | A2 |
| 8 | `v33-scanner-branding` | A4 |
| 9 | `v33-scanner-short-code` | A16 |
| 10 | `v33-scanner-fast-camera` | A17 |
| 11 | `v33-scanner-username-auth` | A6 + E3 |
| 12 | `v33-gastro-local-approval` | E1 |
| 13 | `v33-gastro-multi-local` | E2 |
| 14 | `v33-admin-discount-create` | C1 |
| 15 | `v33-activities-rename` | B1 |
| 16 | `v33-activity-coupons` | B2 |
| 17 | `v33-discount-qr-studio` | D1 |
| 18 | `v33-admin-campaigns-email` | C2 email |
| 19 | `v33-coupon-reconciliation` | F1 |

---

## 21. QA / deploy pendientes anteriores (V3.2)

- Deploy VPS hotfixes `15f2776`…`920c5d7`
- QA prod cache HTML, roles discovery, auth resend, horarios overnight
- QA manual V3.2 browser (`V3_2_QA_CLOSING.md`)
- Migraciones gastro cortesías/recurrencia en VPS si faltan
- QA gastro QR V2 manual staging/prod

---

## Context updates recommended after Slice 0

Al iniciar implementación, actualizar:

- `docs/context/AI_ENTRYPOINT.md` — índice V3.3
- `docs/context/NEXT_CHAT_HANDOFF.md` — roadmap activo
- `docs/context/CONTEXT_PENDIENTES.md` — sección V3.3
- `docs/context/BACKEND_CONTEXT.md` — nuevos endpoints/kinds
- `docs/context/FRONTEND_CONTEXT.md` — rutas y componentes V3.3
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` — ítems cerrados al deploy
- `docs/audits/GASTRO_QR_COURTESIES_AUDIT.md` — si cambia lifecycle descuentos
- `docs/scanner/` (crear si no existe) — flujo username + branding

---

*Auditoría generada contra código en `feat/v1-s03-api-foundation`. Repo como fuente final de verdad.*
