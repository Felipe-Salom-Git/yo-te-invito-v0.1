# V3.3 — Etapa 7 — Auditoría Actividades + Cupones QR

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD al auditar:** `0d8744e` (`docs(v3.3): close gastro qr studio context`)  
**Slice:** 7.0 (solo auditoría + decisiones; sin implementación de funcionalidad)

No reabre Etapas 5/6. Alcance: reutilizar principios de Gastro Discounts V3 para la vertical pública **Actividades** (`Event.category = excursion`) **sin** alias de `GastroDiscount` y **sin** framework universal de cupones.

Checklist origen: **B2** — `Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md` § B2.

Copy público: **Actividades** (`excursionPublicCopy.ts`). Clave técnica: **`excursion`**. Rutas públicas: **`/excursiones/*`**. No migrar `excursion → activity` en DB/API.

---

## 1. Estado real

### 1.1 Actividades hoy

```
Tenant
  └── ExcursionOperator          (admin CRUD; isActive / deletedAt)
        └── Event[category=excursion]
              ├── schedule TEXT (no EventOccurrence)
              ├── isTicketingEnabled = false (create admin)
              └── NO cupones
```

| Hecho | Evidencia |
|-------|-----------|
| Operador comercial | `ExcursionOperator` |
| Producto público | `Event` con `category = 'excursion'` y `excursionOperatorId` |
| Quién crea | **Solo ADMIN** — `POST /admin/excursion-operators` y `POST /admin/excursion-operators/:id/excursions` |
| Portal operador | **No existe.** No hay `UserExcursionMembership`, no hay `Role.EXCURSION_*` |
| Ownership service | **No existe** equivalente a `GastroOwnershipService`. Checks: `ExcursionOperatorsService.assertOperator` + tenant |
| Ticketing | Create admin fuerza `isTicketingEnabled: false`; schedule es texto en `Event` |
| Cupones | **Ninguno** en excursion/operator |
| Copy vs ruta | Público «Actividades»; rutas `/excursiones`, `/categoria/excursion` |

Servicios: `apps/api/src/modules/excursion-operators/`. UI admin: `/admin/excursiones/operadores/...`. Ficha pública: `/excursiones/[id]` → `ExcursionProductDetailContent`.

### 1.2 Gastro Discounts V3 (referencia, no alias)

Unidad: `GastroDiscount` → `GastroProfile` + `Event` gastro. Claims, QR prefix `yti:gastro-discount:v1`, short code 6 chars **global unique** en `GastroDiscountClaim.shortCode`, scanner `ScannerParentProfileType.GASTRO`.

Lifecycle Etapa 5: publicado `ACTIVE`/`APPROVED` + `pendingUpdate` JSON (no `GastroDiscountVersion`). Courtesy, comisión, followers: **específicos Gastro — no copiar**.

### 1.3 Scanner

`ScannerAccount` = **un** parent (`parentProfileType` + `parentProfileId`). **No** hay `eventIds[]`.

| Parent | Targets hoy |
|--------|-------------|
| `PRODUCER` | Eventos ticketeados (`assertScannerCanAccessEvent` exige `PRODUCER`) |
| `GASTRO` | `GastroDiscount` del perfil |
| `EXCURSION_OPERATOR` | `{ events: [], discounts: [] }` — enum **reservado, no cableado** |
| `RENTAL_LOCATION` | Vacío |

`assertParentProfileAccess` **prohíbe** a no-admin crear scanners `EXCURSION_OPERATOR`. Admin puede linkear (`assertParentProfileExists` sí resuelve `ExcursionOperator`).

QR camera: `classifyQrScanPayload` → `'ticket' \| 'gastro-discount' \| 'unknown'`. Manual: gastro 6-char `XXX-XXX` vs ticket 8-char **por parent type del Scanner**, no por búsqueda global combinada.

### 1.4 QR Studio (Etapa 6)

`GastroDiscountTemplate` 1:0..1. Primitives en `packages/shared/src/visual-template/*`. Renderer `DiscountTemplateRenderer` + bindings `gastroName` / `discountTitle` / `discountValue` / `shortCode`. `TicketStudioClient` **no tocado**.

---

## 2. Respuestas a las 10 preguntas

### 2.1 ¿Qué código Gastro se comparte?

**Reutilizar in-place (sin renombrar Gastro):**

| Pieza | Path | Uso Etapa 7 |
|-------|------|-------------|
| Normalize/display short code | `packages/shared/src/scanner/manual-short-code.util.ts` | Mismo `XXX-XXX` 6 chars |
| Charset short code | `apps/api/src/common/gastro-claim-short-code.util.ts` | Copiar allocate contra tabla Activity (no mezclar lookup) |
| Calendario AR inclusivo | `packages/shared/src/gastro-discount-expiry.ts` | DATE_RANGE (helpers de fecha; no el cron Gastro) |
| Benefit formatter | `formatDiscountVisualBenefit` | Alias `formatCouponVisualBenefit` (PERCENT / `$`) |
| Visual primitives | `packages/shared/src/visual-template/*` | Solo si entra Studio (7.8 diferido) |
| `TicketQrImage` | tickets/gastro | Fallback card |
| Mail / `UserNotificationsService` / `NotificationDeliveryLog` | infra | Claim email usuario |
| `classifyQrScanPayload` | `gastro-discount-qr.ts` | Extender familia, no romper gastro/tickets |
| Pattern pendingUpdate / archive / metrics | diseño | Copiar patrón, **no** el schema Gastro |

### 2.2 ¿Qué queda Gastro-specific?

- Todos los modelos/enums `Gastro*`
- `GastroOwnershipService`, memberships, `?profileId=`
- `GastroCourtesyCampaign`, followers, `COMMISSION_NEGOTIATION`
- Prefix `yti:gastro-discount:v1` y legacy pipes
- `GastroDiscountClaim.shortCode` `@unique` global **en esa tabla**
- Scanner parent `GASTRO` + `assertScannerCanAccessGastroDiscount`
- Rutas `/descuentos/*`, `/gastro/descuentos/*`, admin `gastronomicos/*`
- `GastroDiscountTemplate` y Studio `/gastro/descuentos/[id]/qr-studio`
- Notification kinds `GASTRO_DISCOUNT_*`
- Bindings `gastroName`

**No** convertir `GastroDiscount` en `Coupon`.

### 2.3 ¿Modelo ActivityCoupon separado?

**Sí.** Prisma nuevo, vertical-specific:

```
Event[category=excursion]
  └── 0..N ActivityCoupon
        ├── 0..N ActivityCouponClaim
        └── 0..N ActivityCouponValidation
```

Opcional denormalizado: `ActivityCoupon.excursionOperatorId` (índice scanner) **siempre** coherente con `Event.excursionOperatorId`. Guard de categoría en backend: rechazar `event` / `gastro` / `rental` / `hotel`.

**No** FK a `EventOccurrence` en V1. Columna futura documentada como deuda (`future occurrence scoping`).

**No** reutilizar `GastroDiscount.eventId` ni `Event.gastroDiscounts`.

Nombres Prisma (producto Actividades, no ticketing):

| Modelo | Rol |
|--------|-----|
| `ActivityCoupon` | Oferta |
| `ActivityCouponClaim` | Reclamo usuario + QR token + shortCode |
| `ActivityCouponValidation` | Trazabilidad scan (no borrar) |

`ExcursionOperator` permanece el parent comercial. `Event.category` permanece `excursion`.

### 2.4 ¿Quién es owner?

```
ActivityCoupon.eventId
  → Event (tenantId, category='excursion', deletedAt null)
  → Event.excursionOperatorId
  → ExcursionOperator (tenant, isActive, deletedAt null)
```

**Escritura V1:** `Role.ADMIN` (igual que create de operator/actividad).  
**No** hay operador self-service. Slice 7.3 «portal operador» = **UI admin** bajo `/admin/excursiones/operadores/[operatorId]/...` (quién opera Actividades hoy).

`createdByUserId` + `createdByOrigin` (`ADMIN` \| `OPERATOR`). V1 solo escribe `ADMIN`.

Deuda (no bug): portal self-service + `UserExcursionMembership` + role operador. **No** copiar C1/Etapa 4 memberships en esta etapa.

### 2.5 ¿Cómo scopea Scanner?

Reutilizar `ScannerAccount` existente. **No** crear `ActivityScannerAccount`.

```
ScannerAccount.parentProfileType = EXCURSION_OPERATOR
ScannerAccount.parentProfileId   = ExcursionOperator.id
```

Regla: scanner del operador **puede validar cupones de cualquier Event excursion de ese operador**.

Nuevo: `assertScannerCanAccessActivityCoupon` (parent `EXCURSION_OPERATOR` + coupon.operator/event match).  
`getScanTargetsForScanner`: lista cupones `ACTIVE`/`APPROVED` no archivados de events del operador (no tickets: ticketing sigue off).

Admin linkea scanners `EXCURSION_OPERATOR` (ya existe `assertParentProfileExists`). Abrir `assertParentProfileAccess` **solo** para ADMIN en V1 (igual hoy).

Productora **no** valida cupones de Actividades. Gastro **no** valida cupones de Actividades.

### 2.6 ¿Cómo resolver short-code namespace?

**Mínimo seguro: contexto Scanner (parent type), no búsqueda cruzada.**

| Vertical | Tabla | Formato |
|----------|-------|---------|
| Gastro | `GastroDiscountClaim.shortCode` `@unique` | 6 chars, display `XXX-XXX` |
| Actividad | `ActivityCouponClaim.shortCode` `@unique` (tabla propia) | **mismo** 6 chars / display |
| Tickets | cola 8 chars del `ticketId`, scoped a evento | distinto |

**Nunca** `find gastro OR activity ORDER BY first`. Gastro validate sigue `findUnique` gastro. Activity validate **solo** tabla activity.

Colisión visual `ABC-123` en ambas tablas: válida. Scanner Gastro → gastro; Scanner Actividad → activity; código del otro vertical → `INVALID`.

QR camera no choca: prefixes distintos.

Allocate: loop propio contra `ActivityCouponClaim` (charset idéntico). No hace falta prefix `AC-` (rompería UX y chocaría longitud 8 con tickets si se elige mal).

### 2.7 ¿Qué validity modes V1?

| Mode | V1 |
|------|----|
| `DATE_RANGE` | **Obligatorio** (mínimo producto) |
| `WEEKLY_RECURRING` | **Incluir en schema** (paridad Gastro, reutiliza helpers de fecha/weekday). UI admin puede exponerlo si el copy es trivial. |
| Por `EventOccurrence` | **No** |

Timezone: `America/Argentina/Buenos_Aires` (mismos helpers Gastro de calendario). Cron expiry propio (`ActivityCouponExpiryService`), flag propio, **no** mezclar con `GastroDiscountExpiryService`.

### 2.8 ¿QR Studio entra V1 o fallback?

**Diferir custom Studio.** V1 = **fallback visual** (card tipo `GastroDiscountQrCard`, copy Actividades, sin gastro routing).

Motivo: Studio Gastro está acoplado a repos gastro, bindings `gastroName`/`discountTitle`, ruta `/gastro/descuentos/[id]/qr-studio`. Extraer un motor genérico o clonar editor + persistencia + presets **no** es «modelo thin + same engine»; arriesga Etapa 6.

Si más adelante el delta es solo `ActivityCouponTemplate` 1:0..1 + renderer con bindings `activityName` / `couponTitle` / `couponBenefit` / `shortCode` + zona QR: entonces sí (deuda documentada, no bloquea Stage 7).

Canónicos (cuando exista Studio): title, benefit via `formatCouponVisualBenefit(type,value)`, shortCode de claim, QR via `TicketQrImage`. Compile debe seguir borrando `content` de DYNAMIC.

### 2.9 ¿Dónde se muestran claims?

| Superficie | Decisión |
|------------|----------|
| Discovery | Sección **Beneficios / Cupones** en `/excursiones/[id]` (`ExcursionProductDetailContent`). Copy «Actividades». **No** `/actividades/*`. |
| Claim público | `/excursiones/cupones/[id]` (menos disruptivo que `/actividades/cupones`). |
| Usuario | **Opción A:** misma ruta `/me/descuentos` con **dos bloques** (Gastro / Actividades). No renombrar URL. Título de página puede ampliarse a «Mis descuentos» con subtítulos por vertical. **No** mezclar DTOs: dos queries (`me/gastro-discounts` + `me/activity-coupons`). |
| Card pública | **No** reutilizar `GastroDiscountPublicCard` (copy/href gastro). Compartir primitives visuales (QR image, tipografía) si aplica. |

Claims existentes Gastro no se tocan. Claims Activity posteriores no cambian lifecycle Gastro.

### 2.10 ¿Qué migración mínima?

Una migración Prisma (timestamp posterior a `20260831150000_gastro_discount_visual_template`):

- Enums: status, type, origin, validity, claim status (set **más chico** que Gastro: sin courtesy/commission)
- `ActivityCoupon` + `ActivityCouponClaim` + `ActivityCouponValidation`
- Relación `Event.activityCoupons`
- Indexes tenant/status/operator/event; `shortCode`/`qrToken`/`accessToken` unique en claim
- `AuditAction` nuevos (create/edit/approve/reject/archive/redeem — no duplicar scan log si hay validation row)
- **No** alterar tablas Gastro ni `TicketTemplate`

PostgreSQL local: **no asumir aplicada**. Smoke = `NO EJECUTADO` si Docker no está.

---

## 3. Arquitectura objetivo V1

```
Coupon primitives (shared, mínimos)
  ├── yti:activity-coupon:v1 encode/decode
  ├── classifyQrScanPayload + familia 'activity-coupon'
  ├── short-code normalize/display (existente)
  └── formatCouponVisualBenefit alias

Gastro (intacto)
  └── GastroDiscount / Claim / Validation / Template / Scanner GASTRO

Activities
  Event[excursion] → ActivityCoupon → Claim → Validation
  Scanner EXCURSION_OPERATOR → cupones del operador
```

```
Usuario → claim público
  → ActivityCouponClaim (qrToken, accessToken, shortCode)
  → QR payload ≠ short code
  → Scanner parent EXCURSION_OPERATOR
  → ActivityCouponValidation (histórico)
```

---

## 4. Contrato de dominio (propuesto)

### 4.1 `ActivityCoupon` (campos principales)

```
id, tenantId
eventId                 // Event.category = excursion (guard)
excursionOperatorId     // denormalizado; SetNull o Restrict — ver 4.4
title, summary, detail
type                    // PERCENT | FIXED
value                   // Float
validityMode            // DATE_RANGE | WEEKLY_RECURRING
validFrom, validTo, validWeekday, couponDate?
imageUrls               Json
status                  // PENDING_REVIEW | ACTIVE | REJECTED | CANCELLED | EXPIRED
rejectionReason?
pendingUpdate           Json?   // reserva futura operador; V1 admin edita in-place
archivedAt?
qrToken?                // token maestro post-approve (paridad gastro scanner sin claim — V1 puede omitir master QR)
createdByOrigin         // ADMIN | OPERATOR
createdByUserId?
createdAt, updatedAt
```

Sin: `visibility COURTESY_ONLY`, `commission*`, `sourceInboxItemId`, `GastroCourtesyCampaign`.

**Unidad:** 1 cupón → 1 Event excursion. N cupones por actividad.

Delete Event: `onDelete: Cascade` cupones (claims/validations siguen al cupón). Operator delete: no borrar historial — preferir `SetNull` en `excursionOperatorId` **solo si** el Event permanece; V1 no hard-delete operators con cupones (seguir soft `deletedAt`).

### 4.2 Claims

```
tenantId, couponId, userId?, email
qrToken @unique, accessToken @unique, shortCode @unique
status ACTIVE | USED | EXPIRED | CANCELLED
usedAt?, expiresAt?
@@unique([couponId, email])
```

1 claim / email / cupón. Uso único. Duplicate → error de negocio (no segundo QR).  
QR **solo** desde claim (no emitir QR de catálogo al usuario).  
`email == null` → skip EMAIL (regla transversal).

Payload:

```
yti:activity-coupon:v1:<couponId>:<token>
```

Token hex 16–128. Ids cuid alfanuméricos. **No** `yti:gastro-discount:v1` ni `yti:v1:`.

### 4.3 Validation

```
couponId, claimId? @unique, scannerUserId?, validatedAt, result?
```

No borrar. Claim ya `USED` → `ALREADY_USED`, sin segunda validación exitosa (transacción + unique `claimId` en validation, patrón Gastro).

### 4.4 Category guard

Todo write/read operativo:

```
Event.category === 'excursion'
Event.deletedAt == null
Event.tenantId === JWT tenant
Event.excursionOperatorId === coupon.excursionOperatorId
```

Frontend no es autoridad.

---

## 5. Lifecycle V1

Admin (único writer):

```
create  → ACTIVE + origin ADMIN   (como gastro on-behalf)
edit    → in-place (admin es moderador)
reject  → no aplica a create admin; reserva status REJECTED
archive → archivedAt soft; no hard-delete claims/validations
cancel  → CANCELLED
expiry  → cron → EXPIRED
```

`PENDING_REVIEW` queda en enum para futuro operador. **No** bajar `ACTIVE → PENDING_REVIEW` (invalidaría scanner/claims).

`pendingUpdate`: columna lista; **UI pending-edit diferida** hasta existir operador ≠ admin. «Si aplica» hoy: **no aplica** el flujo Gastro gastro-edit→admin-approve.

Materiales (cuando exista pending): `title`, `summary`, `detail`, `imageUrls`, **`type`**, **`value`**, validity fields. Allowlist no toca ids, tenant, event, operator, status, tokens, claims.

---

## 6. Scanner — resultados

Reutilizar shape Gastro (`VALID`, `INVALID`, `EXPIRED`, `INACTIVE`, `NOT_VALID_TODAY`, `ALREADY_USED`). Sin `LIMIT_REACHED` (no cupos V1).

| Caso | Resultado |
|------|-----------|
| QR/token OK, claim ACTIVE, vigencia OK, scope OK | `VALID` + persist validation |
| Claim USED | `ALREADY_USED` |
| Cupón EXPIRED / fuera de DATE_RANGE | `EXPIRED` / `NOT_VALID_TODAY` |
| CANCELLED / no ACTIVE | `INACTIVE` |
| Payload gastro/ticket / short code de otra vertical | `INVALID` |
| Scanner PRODUCER o GASTRO | 403 scope **antes** de redeem |
| Parent EXCURSION_OPERATOR de **otro** operador | 403 |

PWA: picker cuando `parentProfileType === EXCURSION_OPERATOR` (lista cupones). `classifyQrScanPayload === 'activity-coupon'` → endpoint activity. Short code + parent excursion → mismo endpoint. **Regression:** tickets + gastro QR + gastro short code intactos.

Endpoint (propuesto):

```
POST /scanner/activity-coupons/validate
```

Targets: extender `ScannerScanTargetsResponse` con `activityCoupons[]` (o reutilizar `discounts[]` **solo** si el schema actual no asume gastro). Preferir campo nuevo para no mezclar IDs.

---

## 7. API (propuesta, no inventar al implementar: alinear con código)

Admin (V1 canónico):

```
GET/POST   /admin/excursion-operators/:operatorId/activity-coupons
GET/PATCH  /admin/excursion-operators/:operatorId/activity-coupons/:couponId
POST       .../approve | reject | archive | status   (según necesidad real)
GET        .../metrics
```

Público:

```
GET  /public/events/:eventId/activity-coupons     (o /public/excursions/:id/coupons)
GET  /public/activity-coupons/:id
POST /public/activity-coupons/:id/claim
GET  /public/activity-coupons/claims/:claimId
```

Me:

```
GET /me/activity-coupons
```

Scanner: ver §6.

Paths finales = los del controller al implementar. Tenant = JWT (admin/me/scanner) o query público.

Ownership: admin role + operator/event/tenant match. Query `?operatorId=` no autoriza solo.

---

## 8. Frontend

```
UI → TanStack Query → Repository → ApiRepository → Nest
```

Sin fetch directo.

| Ruta | Rol |
|------|-----|
| `/admin/excursiones/operadores/[operatorId]/cupones` | list/create |
| `/admin/excursiones/operadores/[operatorId]/cupones/[couponId]` | detalle/editar/métricas |
| `/excursiones/[id]` | sección cupones vigentes |
| `/excursiones/cupones/[id]` | claim |
| `/me/descuentos` | bloque Actividades |

GCS: `POST /uploads/public-image`. Scope existente (evaluar `event` / admin excursion). HTTPS. Sin data URLs. Sin bucket nuevo.

---

## 9. Metrics V1

Por cupón: `claims issued`, `used`, `unused` (issued − used − cancelled/expired), `validations`, use rate.

Sin conciliación, sin Payment/Payout/ReferralPaymentRequest. Cadena futura Etapa 9: coupon → claim → validation → settlement (no implementar).

---

## 10. Notifications V1

Evitar explosión de enums.

| Evento | V1 |
|--------|----|
| Claim usuario | EMAIL (si `email != null`) + IN_APP. Template nuevo activity (no gastro-discount-qr copy gastro) |
| Pending / approved / rejected operador | **Diferido** (no hay usuario operador) |
| Expired | **Diferido** (no hay destinatario operador; digest Etapa 8) |

No fake emails.

---

## 11. Slice 7.1 — ¿extraer?

**Sí, mínimo y reversible:**

1. `packages/shared/src/activity-coupon-qr.ts` — prefix, build/parse  
2. Extender `QrScanFamily` + `classifyQrScanPayload` (activity **antes** o **después** de gastro; gastro parse no debe tragar el prefix nuevo)  
3. `formatCouponVisualBenefit` = alias de `formatDiscountVisualBenefit`  
4. Tests: `test:gastro-discount-qr` + `test:scanner-manual-short-code` **PASS**; nuevo `test:activity-coupon-qr`

**No extraer:** pending-update Gastro, expiry service Gastro, `GastroDiscount` schemas, visual Studio, short-code allocator gastro (solo charset/pattern).

Si 7.1 se hincha: no crear slice artificial — los helpers QR pueden vivir en el mismo commit que 7.2. Preferencia: commit 7.1 separado porque toca `classifyQrScanPayload` (superficie Scanner compartida).

---

## 12. Slices confirmados

| Slice | Objetivo | Commit sugerido |
|-------|----------|-----------------|
| **7.0** | Esta auditoría | `docs(v3.3): audit activity coupons architecture` |
| **7.1** | QR family + alias benefit + tests gastro | `refactor(v3.3): extract reusable coupon primitives` |
| **7.2** | Prisma + domain service + tests lifecycle | `feat(v3.3): add activity coupon domain` |
| **7.3** | Admin CRUD (superficie operador) | `feat(v3.3): add activity coupon management` |
| **7.4** | Claim + QR + short code + `/me` API | `feat(v3.3): add activity coupon claims` |
| **7.5** | Scanner validate + targets + PWA | `feat(v3.3): validate activity coupons in scanner` |
| **7.6** | Ficha `/excursiones/[id]` + claim UX | `feat(v3.3): add activity coupon public ux` |
| **7.7** | Metrics + claim notification | `feat(v3.3): add activity coupon metrics and notifications` |
| **7.8** | **Skip Studio** — fallback only; nota en closing | — (no commit vacío) |
| **7.9** | Hardening + `V3_3_STAGE_7_ACTIVITY_COUPONS_CLOSING.md` | cierre técnico |

---

## 13. Deuda de producto (no bugs)

- Cupón por `EventOccurrence` / salida / turno  
- Cupón por reserva / pasajero / cupo  
- Multi-use claims  
- Eligibility avanzada  
- Settlement / campañas / WhatsApp / email blast  
- Portal operador self-service + memberships  
- Pending-edit UI (operador ≠ admin)  
- Custom QR Studio Activity  
- Copy template / PNG-PDF server  
- Ampliar C1 on-behalf «operator user» (no aplica: admin ya es el writer)

---

## 14. No hacer (Etapa 7)

Campaigns, WhatsApp, Email blast, Settlement, Payments, booking engine, reservas Activity, Coupon genérico, migrar `excursion` → `activity`, refactor masivo Gastro, tocar `TicketStudioClient`, push, context update global.

---

## 15. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Romper Gastro/tickets Scanner | Prefix nuevo; lookup tablas separadas; tests `test:gastro-discount-qr`, `test:scanner-manual-short-code`, gastro claim tests |
| Admin-only vs «portal operador» | Documentar: admin **es** el operador V1 |
| Short code 6-char duplicado visual | Scope por parent Scanner |
| `EXCURSION_OPERATOR` scanners vacíos hoy | Cablear targets cupones; no abrir ticket scan excursion |
| Category guard | Reject en service, no solo Zod frontend |
| DB local | Migración en repo; smoke `NO EJECUTADO` si no hay Postgres |

---

## 16. Builds 7.0

Sin cambios de código. Árbol limpio al auditar: `HEAD 0d8744e`, branch `feat/v1-s03-api-foundation`.
