# V3.3 — Etapa 5 — Cierre técnico Descuentos Gastro V3

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD al cierre técnico:** `c91c205` (`fix(v3.3): harden gastro discount reapproval lifecycle`)  
**Auditoría:** [`V3_3_STAGE_5_GASTRO_DISCOUNTS_AUDIT.md`](./V3_3_STAGE_5_GASTRO_DISCOUNTS_AUDIT.md)

Contextos globales (`AI_ENTRYPOINT.md`, `NEXT_CHAT_HANDOFF.md`, `PROJECT_CONTEXT.md`, `BACKEND_CONTEXT.md`, `FRONTEND_CONTEXT.md`, `CONTEXT_PENDIENTES.md`) y checklist V3.3 se actualizan en el commit documental posterior: `docs(v3.3): close gastro discounts stage context`.

**Pre-cierre / hardening:** `type` y `value` son cambios materiales. Admin create ACTIVE se verificó sin cambios. Cron de expiry activo por defecto (solo se apaga con `GASTRO_DISCOUNT_EXPIRY_CRON_ENABLED=false`).

---

## 1. Objetivo

Implementar:

| ID | Resultado |
|----|-----------|
| **A1** | Re-aprobación al editar descuento publicado: modelo publicado + pending update |
| **A8** | Materializar `EXPIRED` + notificar una vez por descuento |
| **A24** | Histórico / archivo soft (`archivedAt`); no borrar claims/metrics |
| **C1** | Admin crea descuento para un `GastroProfile` concreto |
| **A9** | Notificaciones de lifecycle de descuento + perfil Gastro (pendiente Etapa 4) |

---

## 2. Arquitectura final

`GastroProfile` sigue siendo la unidad operativa, pública, de aprobación, de descuentos y de scanners.

```
User
  ↓
UserGastroMembership (ACTIVE)
  ↓
GastroProfile
  ↓
GastroDiscount   ← same discountId siempre
```

No se creó `GastroOrganization`, `GastroBranch`, `GastroLocation` compartida, `GastroDiscountVersion` ni motor genérico de cupones.

Ownership: `discountId` → `gastroProfileId` → `GastroOwnershipService.assertCanOperateProfile`. `?profileId=` es navegación, no autorización.

---

## 3. Modelo / migraciones

**Migración:** `apps/api/prisma/migrations/20260831140000_gastro_discount_v3_lifecycle/migration.sql`

**Aplicada contra PostgreSQL local:** **NO EJECUTADO** (sin Docker/DB).

`npx prisma validate` / `pnpm --filter api exec prisma validate`: **PASS**

### 3.1 `GastroDiscount` — campos agregados

| Campo | Tipo | Notas |
|-------|------|--------|
| `pendingUpdate` | `Json?` | Allowlist server-side; nunca `req.body` |
| `pendingUpdateSubmittedAt` | `DateTime?` | |
| `pendingUpdateSubmittedByUserId` | `String?` | FK `User` `onDelete: SetNull` |
| `archivedAt` | `DateTime?` | Soft archive; no es un status |
| `createdByOrigin` | `GastroDiscountOrigin` | `GASTRO` \| `ADMIN`, default `GASTRO` |
| `createdByUserId` | `String?` | FK `User` `onDelete: SetNull` (deep delete no rompe) |

### 3.2 Enums

- `GastroDiscountOrigin`: `GASTRO`, `ADMIN`
- `AuditAction`: `GASTRO_DISCOUNT_EDIT_SUBMITTED`, `EDIT_APPROVED`, `EDIT_REJECTED`, `ARCHIVED`, `UNARCHIVED`, `ADMIN_GASTRO_DISCOUNT_CREATED`, `GASTRO_PROFILE_APPROVED`, `GASTRO_PROFILE_REJECTED`
- `NotificationKind`: `GASTRO_DISCOUNT_PENDING_REVIEW`, `APPROVED_BY_ADMIN`, `REJECTED_BY_ADMIN`, `EXPIRED`, `GASTRO_PROFILE_APPROVED_BY_ADMIN`, `GASTRO_PROFILE_REJECTED_BY_ADMIN`

Filas existentes: pending null, `createdByOrigin=GASTRO`, `archivedAt` null. Sin backfill destructivo.

`AdminDeepDeleteService` **no** se modificó: las FKs nuevas son `SetNull`.

---

## 4. Pending edits (A1)

**No** se implementó `ACTIVE → status PENDING_REVIEW` (invalidaría scanner/QR).

```
GastroDiscount ACTIVE/APPROVED
        ├── campos publicados  → discovery, scanner, claims, QR
        └── pendingUpdate?     → cola admin (diff published vs proposed)
```

| Acción | Efecto |
|-------|--------|
| Edit material de `ACTIVE`/`APPROVED` | Conserva publicado; guarda pending; **no** cambia status; **no** regenera `qrToken` / claims / shortCode |
| Sin cambio material | No-op (o limpia pending si la propuesta vuelve al publicado) |
| `PENDING_REVIEW` (descuento nuevo) | Edit in-place; no se confunde con edición de publicado |
| Admin aprueba edición | Transacción: apply allowlist → clear pending → AuditLog → notificación. Mismo `discountId` |
| Admin rechaza edición | Clear pending; publicado intacto; AuditLog → notificación |

---

## 5. Campos materiales

Allowlist (`GASTRO_DISCOUNT_PENDING_UPDATE_KEYS` + `hasMaterialDiscountChanges`):

```
title, summary, detail, imageUrls,
type, value,
validityMode, validWeekday, validFrom, validTo, discountDate
```

`type` y `value` son **materiales** (hardening pre-cierre): cambian la oferta comercial (`10% → 50%`, `$5000 OFF → 50% OFF`) y no pueden publicarse in-place sobre un descuento ya `ACTIVE`/`APPROVED`.

Fechas comparadas por calendar key AR, no por instante UTC.

**No materiales / bloqueados en pending JSON:** `id`, `tenantId`, `gastroProfileId`, `eventId`, `status`, `qrToken`, `code`, `createdBy*`, `archivedAt`, claims, validations.

Al promover una edición: se aplican `type`/`value` allowlisteados. QR, shortCode y claims no se tocan.

---

## 6. Admin moderation

- Lista pending: status `PENDING_REVIEW`/`COMMISSION_NEGOTIATION` **o** `pendingUpdateSubmittedAt != null`
- UI: badges **Nuevo pendiente** vs **Edición pendiente**; origen Admin vs Gastro
- Diff: `AdminGastroPendingEditPanel`
- Rutas: `POST .../approve-edit` y `reject-edit` (ticket global y nested por profile)
- Dashboard admin incluye ambos tipos (`reviewKind` NEW/EDIT)

---

## 7. Expiry (A8)

Fuente de verdad: `packages/shared/src/gastro-discount-expiry.ts` (calendario AR).

`GastroDiscountExpiryService` materializa `EXPIRED` sobre candidatos `ACTIVE`/`APPROVED` no archivados.

**Scheduler (un solo cron, no hay segundo mecanismo):**

| Entorno | Expresión | Default |
|---------|-----------|---------|
| development (`NODE_ENV=development`) | `*/15 * * * *` | **activo** |
| production / resto | `5 * * * *` | **activo** |

`GASTRO_DISCOUNT_EXPIRY_CRON_ENABLED`:

- **Default real:** activo. El job solo se salta si el valor es exactamente el literal `false`.
- Omitir la variable, `true`, o cualquier otro valor → el cron corre.
- Documentado en `apps/api/.env.example`.
- En producción **no** setear `false` salvo apagado deliberado de A8.

Weekly sin `validTo`: **no** expira.

---

## 8. Archive (A24)

`archivedAt` soft. Status histórico se conserva (`EXPIRED` + archivado, etc.).

Archivable: `EXPIRED` \| `CANCELLED` \| `REJECTED`, o `ACTIVE`/`APPROVED` ya vencidos por fecha.

No archivar `PENDING_REVIEW` ni `ACTIVE` vigente. Unarchive limpia `archivedAt` sin cambiar status.

Archivar **no** borra claims, validations, metrics, AuditLog, QR, shortCode.

Discovery público: `archivedAt: null`.

Portal `/gastro/descuentos` y admin local: tabs Activos / Pendientes / Vencidos-finalizados / Archivados.

---

## 9. C1 — Admin create on-behalf

`POST /admin/gastronomicos/:profileId/descuentos`

- Target: `GastroProfile` **ACTIVE** con `publicEventId` (selección explícita; nunca “primer local”)
- `createdByOrigin=ADMIN`, `createdByUserId=admin`
- Status inicial: **`ACTIVE`** (equivalente a un approve normal; no hay auto-PENDING)
- Tenant isolation: `assertProfile(tenantId, profileId)`
- Followers: `FOLLOWED_GASTRO_NEW_DISCOUNT` (igual que approve)
- Lifecycle notify: `GASTRO_DISCOUNT_APPROVED_BY_ADMIN` (`:create`)
- Audit: `ADMIN_GASTRO_DISCOUNT_CREATED`

**Invariantes ACTIVE (pre-cierre: ya correctas, sin cambio de código):**

| Invariante | Admin create |
|------------|----------------|
| `tenantId` / `gastroProfileId` / `eventId` | del profile target |
| `qrToken` + `qrGeneratedAt` | generados al crear |
| `displayImageUrls` | = imágenes enviadas (`submittedImageUrls`) |
| vigencia | `normalizeGastroDiscountValidFromDate` / `ExpiryDate` (DATE_RANGE) o weekday (WEEKLY) |
| origin / creator | `ADMIN` + `createdByUserId` |
| status | `ACTIVE` vía `initialStatusForDiscountOrigin('ADMIN')` |

`type`/`value` al crear siguen el contrato de formulario actual (`PERCENT` / `0`), igual que Gastro create. Cambiarlos después sobre un ACTIVE pasa por pending edit.

Gastro create: `PENDING_REVIEW`, origin `GASTRO`.

---

## 10. Notificaciones (A9 + Etapa 4)

Servicio: `GastroLifecycleNotificationsService` → `UserNotificationsService` (IN_APP / EMAIL / PUSH, BullMQ, WebPush, `NotificationDeliveryLog`).

| Evento | Kind | `referenceKey` |
|--------|------|----------------|
| Descuento nuevo enviado | `GASTRO_DISCOUNT_PENDING_REVIEW` | `gastro-discount-pending:{id}:create` |
| Edición enviada | mismo kind | `gastro-discount-pending:{id}:edit` |
| Nuevo aprobado / admin crea ACTIVE | `GASTRO_DISCOUNT_APPROVED_BY_ADMIN` | `...-approved:{id}:create` |
| Edición aprobada | mismo kind | `...-approved:{id}:edit` |
| Nuevo rechazado | `GASTRO_DISCOUNT_REJECTED_BY_ADMIN` | `...-rejected:{id}:create` |
| Edición rechazada | mismo kind | `...-rejected:{id}:edit` |
| Vencido | `GASTRO_DISCOUNT_EXPIRED` | `gastro-discount-expired:{id}` (sin aspect) |
| Perfil aprobado | `GASTRO_PROFILE_APPROVED_BY_ADMIN` | `gastro-profile-approved:{profileId}` |
| Perfil rechazado | `GASTRO_PROFILE_REJECTED_BY_ADMIN` | `gastro-profile-rejected:{profileId}` |

Canales: IN_APP siempre; EMAIL si `User.email` no null y `emailNotificationsEnabled`; PUSH según `notifyUnreadNotifications`.

Email template único: `GASTRO_LIFECYCLE`. Email null → skip EMAIL (nunca se fabrica).

Recipients: memberships **ACTIVE** del `GastroProfile` afectado (multi-local: Local A no notifica a quien solo administra Local B).

Dedupe: unique `(userId, kind, referenceKey, channel)` en `NotificationDeliveryLog`. El cron de expiry no reenvía.

**Admin digest consolidado de vencidos:** **DEFERIDO a Etapa 8**. Dashboard gastro ya tiene alerta `EXPIRED_DISCOUNTS`.

---

## 11. Claims / QR / scanner

| Recurso | Preservado |
|---------|------------|
| Claims existentes durante pending edit | sí — resuelven contra publicado |
| QR `yti:gastro-discount:v1:<discountId>:<token>` | sí — no se regenera en edición |
| Short code `XXX-XXX` ≠ token QR | sí |
| Scanner `POST /scanner/gastro-discounts/validate` | sí — padre `ACTIVE`\|`APPROVED` |
| Métricas / validations | mismo `discountId`; no reset |

---

## 12. Ownership / tenant

Confirmado:

- Portal: `assertOwnDiscount` → profile → `assertCanOperateProfile`
- Admin: `loadDiscount` scoped por `tenantId` + profile
- Pending JSON: Zod `.strict()` + allowlist al promover
- C1: profile del tenant; no primer ACTIVE arbitrario

---

## 13. Tests

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api run test:gastro-discount-expiry` | PASS |
| `pnpm --filter api run test:gastro-discount-qr` | PASS |
| `pnpm --filter api run test:gastro-discount-scan` | **NO EJECUTADO** — requiere PostgreSQL (`localhost:5433`) |
| `pnpm --filter api run test:gastro-multi-local` | PASS |
| `pnpm --filter api run test:gastro-discount-pending-edit` | PASS |
| `pnpm --filter api run test:gastro-discount-edit-moderation` | PASS |
| `pnpm --filter api run test:gastro-discount-archive` | PASS |
| `pnpm --filter api run test:gastro-discount-origin` | PASS |
| `pnpm --filter api run test:gastro-lifecycle-notifications` | PASS |

---

## 14. Builds

| Package | Resultado |
|---------|-----------|
| shared | PASS |
| api | PASS |
| web | PASS |
| scanner | PASS |
| prisma validate | PASS |

---

## 15. DB smoke

```
NO EJECUTADO — PostgreSQL/Docker no disponible
```

Migración `20260831140000_gastro_discount_v3_lifecycle` pendiente de aplicar en el entorno con DB.

---

## 16. QA manual

```
PENDIENTE — acumulado cierre global V3.3
```

Checklist futura Etapa 5:

1. Gastro crea descuento → PENDING_REVIEW + notificación memberships del local.
2. Admin aprueba/rechaza nuevo → notifica; QR solo tras approve.
3. ACTIVE: edición material (incl. `type`/`value`) → publicado intacto; copy “publicado sigue activo”; admin ve diff de oferta; approve aplica; reject descarta.
4. Claim/QR/shortCode previos siguen validando en scanner durante pending.
5. Multi-local: Local A no edita descuento de Local B; notificación no cruza memberships.
6. Admin crea descuento eligiendo profile ACTIVE → nace ACTIVE, origin ADMIN.
7. Vencimiento DATE_RANGE: status EXPIRED + una sola notificación; weekly sin `validTo` no vence.
8. Archivar EXPIRED/CANCELLED/REJECTED; no archivar ACTIVE vigente; metrics/claims siguen.
9. Tabs portal y admin: Activos / Pendientes / Vencidos / Archivados.
10. Usuario sin email: IN_APP sí, EMAIL skip.
11. Perfil Gastro approve/reject (Etapa 4 leftover) entrega notificación.

---

## 17. Deudas / riesgos reales

- Migración Prisma **no aplicada** localmente.
- `test:gastro-discount-scan` no corrió (misma causa: sin Postgres).
- Digest admin de vencidos diferido a **Etapa 8**.
- `APPROVED` sigue en allow-lists sin writer de app (compatibilidad; no se migró el enum).
- QA browser completo **no** hecho en esta etapa.
- Conciliación económica (Etapa 9), QR Studio (Etapa 6), cupones Actividades (Etapa 7): no implementados a propósito.

---

## 18. Commits de la etapa

```
a757c76 docs(v3.3): audit gastro discounts v3 lifecycle
cb1dbaf feat(v3.3): add gastro discount pending edits
a2f308d feat(v3.3): moderate gastro discount edits
46b7773 feat(v3.3): add gastro discount history and archive
7a4b087 feat(v3.3): allow admin gastro discount creation
a18d298 feat(v3.3): add gastro lifecycle notifications
eb344e1 feat(v3.3): refine gastro discount lifecycle ux
692f454 docs(v3.3): close gastro discounts stage
```

Pre-cierre/hardening (este commit): `type`/`value` materiales, cron A8 documentado, invariantes C1 verificadas.

**NO PUSH.**
