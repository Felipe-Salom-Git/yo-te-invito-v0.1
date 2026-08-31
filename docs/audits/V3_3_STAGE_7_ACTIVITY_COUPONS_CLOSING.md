# V3.3 — Etapa 7 — Cierre técnico Actividades + Cupones QR

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD código (hardening scanner):** `a494274` `fix(v3.3): harden activity coupon scanner scope`  
**Auditoría:** [`V3_3_STAGE_7_ACTIVITY_COUPONS_AUDIT.md`](./V3_3_STAGE_7_ACTIVITY_COUPONS_AUDIT.md)

Cierre documental de contextos/checklist: commit `docs(v3.3): close activity coupons context`.  
**No** Etapa 8. **No** deploy. **No** QA global.

Copy público: **Actividades**. Clave técnica: **`excursion`**. Rutas públicas: **`/excursiones/*`**.

**Estado:** Etapa 7 implementada; DB smoke / Scanner DB integration / QA global pendientes.

---

## 1. Arquitectura

```
Coupon primitives (shared, mínimos)
  ├── yti:activity-coupon:v1 encode/decode
  ├── classifyQrScanPayload family 'activity-coupon'
  ├── short-code normalize/display (existente, Gastro)
  ├── formatCouponVisualBenefit alias de formatDiscountVisualBenefit
  ├── validity calendar helpers Gastro (DATE_RANGE / WEEKLY)
  └── computeActivityCouponMetrics + shouldSendActivityCouponClaimEmail

Gastro (intacto)
  └── GastroDiscount / Claim / Validation / Template / Scanner GASTRO / QR Studio

Activities (vertical-specific)
  └── Event[category=excursion] → ActivityCoupon → Claim → Validation
        Admin CRUD + metrics + expiry cron propio
        Public claim + /me bloque Actividades
        Scanner parent EXCURSION_OPERATOR
        Fallback QR card (sin Studio)
```

No se convirtió `GastroDiscount` en `Coupon`. No hay framework universal de cupones.

---

## 2. Shared vs vertical

| Compartido | Vertical-specific |
|------------|-------------------|
| QR payload infra + `classifyQrScanPayload` | Modelos Prisma `ActivityCoupon*` |
| Short-code charset / `XXX-XXX` display | Allocator contra `ActivityCouponClaim` |
| `formatCouponVisualBenefit` (alias) | Schemas `activity-coupons.ts` |
| Calendario AR (`isGastroDiscountDateExpired`, weekday) | Admin/public/me/scanner services |
| `TicketQrImage` en fallback card | Template EMAIL `ACTIVITY_COUPON_QR` |
| `UserNotificationsService` / delivery log | Kind `ACTIVITY_COUPON_CLAIMED` |
| Visual primitives Etapa 6 (no usados en V1 Studio) | Sin `ActivityCouponTemplate` |

**No extraído:** pending-update Gastro, `GastroDiscount*` schemas, Studio Gastro, courtesy, comisión, followers.

---

## 3. Prisma

Migraciones (escritas, **no aplicadas** localmente):

| Timestamp | Contenido |
|-----------|-----------|
| `20260831160000_activity_coupon_domain` | Enums + 3 modelos + `AuditAction` lifecycle/redeem |
| `20260831170000_activity_coupon_claimed_notification` | `NotificationKind.ACTIVITY_COUPON_CLAIMED` + `AuditAction.ACTIVITY_COUPON_CLAIMED` |

```
Tenant
  └── ExcursionOperator
        └── Event[category=excursion]
              └── N ActivityCoupon
                    └── N ActivityCouponClaim  (qrToken, accessToken, shortCode unique)
                          └── 0..1 ActivityCouponValidation (claimId unique → 1 éxito)
```

Campos principales reales de `ActivityCoupon` (Prisma): `tenantId`, `eventId`, `excursionOperatorId`, `code`, `title`, `summary`, `detail`, `type`, `value`, `validityMode`, `validWeekday`, `validFrom`, `validTo`, `couponDate`, `imageUrls`, `status`, `rejectionReason`, `pendingUpdate`, `pendingUpdateSubmittedAt`, `archivedAt`, `createdByOrigin`, `createdByUserId`, `createdAt`, `updatedAt`.

`ActivityCoupon.excursionOperatorId` denormalizado, coherente con `Event.excursionOperatorId`.  
**No** FK a `EventOccurrence`. Scope V1 = Event completo. Futuro occurrence / salida / turno / fecha concreta queda diferido. No es bug.

Enums cupón: `PERCENT` \| `FIXED`; status `PENDING_REVIEW` \| `APPROVED` \| `ACTIVE` \| `REJECTED` \| `CANCELLED` \| `EXPIRED`; origin `ADMIN` \| `OPERATOR`; validity `DATE_RANGE` \| `WEEKLY_RECURRING`. Weekday reutiliza Prisma `GastroWeekday`.

Guard backend: `isEventCategoryEligibleForActivityCoupon` — solo `excursion`. Rechaza `event` / `gastro` / `rental` / `hotel`.

---

## 4. Ownership

```
ActivityCoupon.eventId
  → Event (tenantId, category='excursion', deletedAt null)
  → Event.excursionOperatorId
  → ExcursionOperator (tenant, isActive, deletedAt null)
```

**Escritura V1:** solo `Role.ADMIN` (igual que create de operador/actividad).  
No existe portal operador self-service, ni `UserExcursionMembership`, ni `Role.EXCURSION_*`.

Slice 7.3 «portal operador» = UI admin `/admin/excursiones/operadores/[operatorId]/cupones/...`.

`createdByOrigin` + `createdByUserId` para auditoría. V1 escribe `ADMIN`.

---

## 5. Relación Event

1 `ActivityCoupon` → 1 `Event` category=`excursion`. N cupones por actividad.  
Diseñado para no impedir un futuro `occurrenceId` opcional; **no** implementado.

---

## 6. Lifecycle

| Acción | Resultado V1 |
|--------|----------------|
| Admin create | `ACTIVE` + origin `ADMIN` |
| Admin edit in-place | `ACTIVITY_COUPON_UPDATED` (publicado no pasa a `PENDING_REVIEW`) |
| Approve / reject | Solo si `PENDING_REVIEW` (reservado a futuro operador) |
| Archive | Soft `archivedAt`; no borra claims/validations |
| Expiry cron | `ActivityCouponExpiryService` → `EXPIRED`; flag `ACTIVITY_COUPON_EXPIRY_CRON_ENABLED` (skip si `"false"`); cron **dev `*/15 * * * *`**, **prod `10 * * * *`**; **no** mezcla cron Gastro |

Columna `pendingUpdate` existe; UI pending-edit **diferida** (no hay usuario operador).

---

## 7. Claim / QR / short code

Flujo: usuario → cupón público → claim → `qrToken` + `accessToken` + `shortCode`.  
**No** hay QR maestro en el cupón.

- 1 claim por `(couponId, email)`
- Duplicate ACTIVE → reutiliza claim (reenvía EMAIL)
- USED / EXPIRED → no se re-emite

---

## 8. QR namespace (exacto)

```
yti:activity-coupon:v1:<couponId>:<token>
```

Constante: `ACTIVITY_COUPON_QR_PREFIX`.  
**No** se reutiliza `yti:gastro-discount:v1` ni `yti:v1:`.

QR payload ≠ short code.

---

## 9. Short-code namespace

Mismo formato 6 chars / display `XXX-XXX` que Gastro.

| Vertical | Lookup |
|----------|--------|
| Gastro | **solo** `GastroDiscountClaim.shortCode` |
| Actividad | **solo** `ActivityCouponClaim.shortCode` |
| Tickets | 8 chars, parent PRODUCER |

Resolución por **contexto Scanner** (`parentProfileType`).  
**Nunca** buscar ambos y tomar el primero. Colisión visual `ABC-123` en ambas tablas es válida.

---

## 10. Scanner

**Regla exacta backend (V1, operator-wide):**

```
POST /scanner/activity-coupons/validate
  → requireActiveAccountForScanning(tenantId, scannerUserId)
  → parentProfileType === EXCURSION_OPERATOR
  → ActivityCoupon.findFirst({ id, tenantId })
  → canScannerAccessActivityCoupon:
       scannerParentType === EXCURSION_OPERATOR
       coupon.tenantId === scanner.tenantId
       coupon.excursionOperatorId === ScannerAccount.parentProfileId
       Event.category === excursion
```

Helper: `canScannerAccessActivityCoupon` (`packages/shared`). Usado en `assertScannerCanAccessActivityCoupon`. **No** confía en `discounts[]` de la UI ni en el target seleccionado.

ADMIN (sin ScannerAccount) omite el assert de cuenta; igual carga el cupón por `{ id, tenantId }` y aplica el guard de categoría.

**Scope V1 deliberado:** el scanner del operador valida cupones de **todas** las Actividades (`Event.category=excursion`) de ese `ExcursionOperator`. **No** hay límite por Event, EventOccurrence, salida ni turno. Evolución futura documentada; no se cambia ahora.

- Target picker: `discounts[]` filtrado por `tenantId` + `excursionOperatorId` + `event.category=excursion` (lista UX, no autorización).
- Endpoint: `POST /scanner/activity-coupons/validate`
- **No** `ActivityScannerAccount`.
- Cámara: `classifyQrScanPayload === 'activity-coupon'`.
- Manual: short code → **solo** `ActivityCouponClaim.findUnique` + check `claim.tenantId === scanner tenant` + el mismo assert de scope.
- Resultados: `VALID` / `INVALID` / `EXPIRED` / `INACTIVE` / `NOT_VALID_TODAY` / `ALREADY_USED`.
- Idempotencia: transacción + `claimId` unique en `ActivityCouponValidation`.

**Scanner DB integration:** `test:gastro-discount-scan` y equivalentes Activity vs PostgreSQL = **NO EJECUTADO**. No se declara Scanner PASS de integración.

Deuda cosmética: historial PWA tipa el resultado Activity como `kind: 'gastro-discount'` tras mapear al modal Gastro. El dispatch de familia/endpoint es correcto.

---

## 10.1 Event category guard

Backend `isEventCategoryEligibleForActivityCoupon` / `ACTIVITY_COUPON_EVENT_CATEGORY = 'excursion'`. Rechaza `event` / `gastro` / `rental` / `hotel`.

| Superficie | Dónde |
|------------|--------|
| Create | `assertExcursionEvent` |
| Update / archive / status / metrics | `getRow` (incluye categoría del Event) |
| Public list / get / claim / me | `listPublicByEvent`, `getPublic`, `claimPublic`, `getPublicClaim`, `listMine` |
| Scanner validate | `canScannerAccessActivityCoupon` + check en `ScannerActivityCouponService` |
| Scanner targets | `event.category = excursion` |

No se confía en el frontend.

---

## 10.2 Tenant isolation

| Lookup | Aislamiento |
|--------|-------------|
| ScannerAccount | `findFirst({ tenantId, scannerUserId })` |
| Coupon QR | `activityCoupon.findFirst({ id, tenantId })` |
| Claim QR token | `activityCouponClaim.findFirst({ couponId, qrToken, tenantId })` |
| Short code | `ActivityCouponClaim.findUnique(shortCode)` luego `claim.tenantId !== tenantId` → `INVALID` (no leak cross-tenant) |

No hay lookup cross-tenant por couponId / token / shortCode.

---

## 11. Public UX

| Ruta | Uso |
|------|-----|
| `/excursiones/[id]` | Sección **Beneficios / Cupones** |
| `/excursiones/cupones/[id]` | Claim |
| `/excursiones/cupones/reclamo/[claimId]` | Ver QR / short code |
| **No** `/actividades/*` | — |

Card: `ActivityCouponQrCard` (no `GastroDiscountPublicCard`).

---

## 12. /me

URL sin cambiar: `/me/descuentos`.  
Dos bloques (Gastronomía + Actividades), dos queries (`me/gastro-discounts` + `me/activity-coupons`). DTOs no mezclados.

---

## 13. Metrics

`GET /admin/excursion-operators/:operatorId/activity-coupons/:couponId/metrics`

| KPI | Definición |
|-----|------------|
| `claimsIssued` | Todos los claims |
| `claimsUsed` | status `USED` |
| `claimsUnused` | status `ACTIVE` |
| `validations` | filas `ActivityCouponValidation` |
| `useRate` | used/issued %, 1 decimal |

Sin conciliación económica. Sin Payment / Payout / ReferralPaymentRequest.

---

## 14. Notifications

| Evento | V1 |
|--------|----|
| Claim usuario | EMAIL template `ACTIVITY_COUPON_QR` si `email` no es null/blank; IN_APP `ACTIVITY_COUPON_CLAIMED` si hay `userId`. `sendEmail: false` en `deliver` para no duplicar. PUSH según prefs unread. |
| Pending / approved / rejected operador | **Diferido** (no hay usuario operador) |
| Expired operador | **Diferido** |

`email == null` → skip EMAIL. No fake emails. Mail no configurado → `emailSent: false`, claim igual se crea.

---

## 15. Visual template

**Diferido.** V1 = fallback `ActivityCouponQrCard`.

Motivo (auditoría 7.0): extraer Studio Gastro a un motor genérico o clonar editor + persistencia **no** es «modelo thin + same engine»; arriesga Etapa 6. Slice 7.8 **sin commit vacío**.

Cuando el delta sea `ActivityCouponTemplate` 1:0..1 + bindings `activityName` / `couponTitle` / `couponBenefit` / `shortCode` + zona QR, se puede retomar.

---

## 16. Gastro / Ticket / QR Studio regression

Unit tests Etapa 5/6 ejecutados en este cierre: **PASS** (ver §18).  
Integración Scanner Gastro vs DB: **NO EJECUTADO**.

---

## 17. Builds

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter shared run build` | PASS |
| `pnpm --filter api run build` | PASS |
| `pnpm --filter web run build` | PASS (SSG logueó `ECONNREFUSED` a API local; el build compiló y tipó OK) |
| `pnpm --filter scanner run build` | PASS |
| `pnpm --filter api exec prisma validate` | PASS |

---

## 18. Tests

| Comando | Resultado |
|---------|-----------|
| `test:activity-coupon-domain` | PASS |
| `test:activity-coupon-ownership` | PASS |
| `test:activity-coupon-claim` | PASS |
| `test:activity-coupon-qr` | PASS |
| `test:activity-coupon-metrics` | PASS |
| `test:activity-coupon-scan` | PASS (solo dispatch unitario; nota DB en el script) |
| `test:gastro-discount-qr` | PASS |
| `test:scanner-manual-short-code` | PASS |
| `test:ticket-template-schema` | PASS |
| `test:discount-visual-template` | PASS |
| `test:discount-visual-render` | PASS |
| `test:gastro-discount-visual-persist` | PASS |
| `test:gastro-discount-pending-edit` | PASS |
| `test:gastro-discount-archive` | PASS |
| `test:gastro-lifecycle-notifications` | PASS |
| `test:gastro-discount-expiry` | PASS |
| `test:gastro-discount-scan` | **NO EJECUTADO** (P1001 `localhost:5433`) |

---

## 19. Migration / DB smoke

Migraciones presentes en repo.  
`prisma migrate status` → **P1001** Can't reach `localhost:5433`.

**DB smoke: NO EJECUTADO.** No se inventa PASS.

---

## 20. QA

Pendiente del cierre global V3.3. Checklist mínimo:

- crear cupón
- editar
- archive
- publicar
- claim
- claim duplicado
- QR
- short code
- scanner QR
- scanner manual
- scanner otro operador
- expired
- already used
- metrics
- `/me`
- public Activity
- mobile

---

## 21. Future Activity evolution (no bugs)

V1 **no** cubre:

- cupón por `EventOccurrence` / salida / turno
- cupón por reserva / pasajero / cupo
- multi-use claims
- eligibility avanzada
- settlement / campañas / WhatsApp / email blast
- portal operador self-service + memberships
- pending-edit UI (operador ≠ admin)
- custom QR Studio Activity
- copy template / PNG-PDF server
- **Scanner por Event / EventOccurrence / salida / turno** (V1 es operator-wide; decisión deliberada, no bug)

---

## 22. Commits

| Slice | Hash | Mensaje |
|-------|------|---------|
| 7.0 | `01aa1a8` | `docs(v3.3): audit activity coupons architecture` |
| 7.1 | `beaf71d` | `refactor(v3.3): extract reusable coupon primitives` |
| 7.2 | `8331c77` | `feat(v3.3): add activity coupon domain` |
| 7.3 | `2c9a30f` | `feat(v3.3): add activity coupon management` |
| 7.4 | `0529749` | `feat(v3.3): add activity coupon claims` |
| 7.5 | `ddcf7df` | `feat(v3.3): validate activity coupons in scanner` |
| 7.6 | `ab56505` | `feat(v3.3): add activity coupon public ux` |
| 7.7 | `2e704cf` | `feat(v3.3): add activity coupon metrics and notifications` |
| 7.8 | — | Skip Studio (sin commit vacío) |
| 7.9 | `fad396b` | `docs(v3.3): close activity coupons stage` |
| Pre-cierre scope | `a494274` | `fix(v3.3): harden activity coupon scanner scope` |

Cobertura del hardening `a494274`: operador correcto; otro operador; parent `GASTRO`; parent `PRODUCER`; categoría no `excursion`; otro tenant; Activity short code ≠ Gastro short code (lookup por vertical).

HEAD previo a 7.0 (Etapa 6 context): `0d8744e`.
