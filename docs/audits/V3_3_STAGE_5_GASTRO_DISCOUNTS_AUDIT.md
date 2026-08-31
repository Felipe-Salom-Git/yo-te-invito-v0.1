# V3.3 — Etapa 5 — Auditoría Descuentos Gastro V3

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD al auditar:** `68afa57`  
**Slice:** 5.0 (solo auditoría + decisiones; sin implementación de funcionalidad)

No reaudita V3.3 completa. Alcance: lifecycle de `GastroDiscount` y contratos adyacentes (claims, scanner, ownership, notificaciones, cron, archive, admin on-behalf).

---

## 1. Estado real

### 1.1 Modelo

`GastroDiscount` es la unidad de oferta. Pertenece a un `GastroProfile` (`gastroProfileId`) y a un `Event` público (`eventId` = `GastroProfile.publicEventId`). Claims, QR y scanner resuelven contra **esta fila**.

No existe `GastroDiscountVersion`, `DiscountRevision` ni árbol de versiones.

### 1.2 Status (`GastroDiscountStatus`)

```
PENDING_REVIEW | COMMISSION_NEGOTIATION | APPROVED | ACTIVE | REJECTED | CANCELLED | EXPIRED
```

| Status | Escritura real | Lectura |
|--------|---------------|---------|
| `PENDING_REVIEW` | Create portal gastro | Moderación admin |
| `COMMISSION_NEGOTIATION` | Admin mark-commission | Cola pending |
| `ACTIVE` | Admin approve; activate; inbox/courtesy | Discovery, scanner, QR |
| `APPROVED` | **Ningún writer** | Allow-lists (`ACTIVE` \| `APPROVED`) |
| `REJECTED` | Admin reject | Cerrado |
| `CANCELLED` | Deactivate portal/admin; deep-delete | “Desactivar” |
| `EXPIRED` | **Ningún writer de app** | Dashboard KPI, scanner reason, enum |

**Compatibilidad:** no migrar nombres de status en Etapa 5. `APPROVED` permanece en allow-lists. Admin approve persiste `ACTIVE` (no deja la fila en `APPROVED`).

### 1.3 Flujo create (Gastro)

```
POST /gastro/discounts
  → GastroOwnershipService.resolveCreateProfileId
  → status PENDING_REVIEW
  → type PERCENT, value 0 (beneficio no es campo de formulario)
  → submittedImageUrls
```

### 1.4 Flujo edit (hoy)

`PATCH /gastro/discounts/:id` actualiza **in-place** título, summary, detail, vigencia, imágenes.

- `ACTIVE` es editable.
- **No** cambia status.
- **No** hay re-aprobación.
- Discovery/scanner ven el contenido nuevo inmediatamente.

Esto es el gap **A1**. Cambiar status a `PENDING_REVIEW` invalidaría QR/claims porque scanner exige padre `ACTIVE` \| `APPROVED`.

### 1.5 Approve / reject (descuento nuevo)

```
PENDING_REVIEW | COMMISSION_NEGOTIATION
  → approve → ACTIVE + qrToken nuevo
  → reject  → REJECTED + rejectionReason
```

Approve exige `displayImageUrls` (publicación admin). Followers: `FOLLOWED_GASTRO_NEW_DISCOUNT`. **No** hay notificación al gastro owner.

### 1.6 Lifecycle operativo

`PATCH .../status` (`ACTIVE` \| `CANCELLED`) vía `GastroDiscountMetricsService`.

Bloqueado si status ∈ `REJECTED` \| `EXPIRED` \| `PENDING_REVIEW` \| `COMMISSION_NEGOTIATION`.

No hay archive. No hay unarchive.

### 1.7 Expiry

Fuente de verdad: `packages/shared/src/gastro-discount-expiry.ts` (calendario AR inclusivo).

- `DATE_RANGE`: vencido cuando `validTo`/`discountDate` es día calendario anterior a hoy.
- `WEEKLY_RECURRING`: no vence salvo `validTo` opcional; fuera del día → `NOT_VALID_TODAY`.

Dashboard `EXPIRED_DISCOUNTS`: cuenta filas con `status = EXPIRED` **o** `discountDate`/`validTo` < now (UTC, no helper AR).

**No hay cron/BullMQ que persista `EXPIRED`.** ScheduleModule existe (`NotificationsSchedulerService`, order expiry, etc.) y es reutilizable.

### 1.8 Claims / QR / scanner

| Contrato | Valor |
|---------|--------|
| QR | `yti:gastro-discount:v1:<discountId>:<token>` |
| Short code | 6 chars, display `XXX-XXX` ≠ token |
| Claim | `GastroDiscountClaim` propio (`qrToken`, `shortCode`, `status`) |
| Scanner | `POST /scanner/gastro-discounts/validate` |
| Padre redeemable | `ACTIVE` \| `APPROVED` + `isGastroDiscountValidToday` |

Edición in-place actual **sí** cambia lo que ve discovery; **no** regenera claim tokens. El riesgo A1 es invalidar el **padre** si se baja a `PENDING_REVIEW`.

### 1.9 Ownership / tenant

`discountId` → `GastroDiscount.gastroProfileId` → `GastroOwnershipService.assertCanOperateProfile`.

`?profileId=` es contexto de navegación, no autorización (hardening Etapa 4 `ea79aa6`).

Create: 1 perfil ACTIVE → auto-select; N ACTIVE → `profileId` obligatorio.

### 1.10 Admin create (C1)

**No existe.** Admin solo modera. Inbox puede crear `ACTIVE` (bypass histórico; no es C1).

No hay `createdByOrigin` ni `createdByUserId` en `GastroDiscount`. `GastroCourtesyCampaign.createdByUserId` sí existe (RESTRICT → bloquea user delete).

### 1.11 Notificaciones

Motor: `UserNotificationsService` + BullMQ + WebPush + `NotificationDeliveryLog`.

Dedupe persistente: unique `(userId, kind, referenceKey, channel)`.

`User.email` nullable → skip EMAIL si null.

Kinds gastro actuales: solo `FOLLOWED_GASTRO_NEW_DISCOUNT`.

**A9 / Etapa 4:** `AdminProfilesService.approveGastroProfile` / `rejectGastroProfile` **no entregan** notificación.

### 1.12 UI

Portal `/gastro/descuentos`: lista plana + label de status. Sin tabs Activos / Pendientes / Vencidos / Archivados.

Admin: cola `GET /admin/gastronomicos/pending-discounts` por status pending. No diferencia edición pendiente (no existe). Detalle en `/admin/gastronomicos/[profileId]/descuentos/[discountId]`.

### 1.13 Deep delete

`suspendGastroInTx`: cancela descuentos; hard-delete solo si no hay claims USED ni validations. No hay FK creator en `GastroDiscount` hoy.

---

## 2. Archivos clave

| Área | Path |
|------|------|
| Schema | `apps/api/prisma/schema.prisma` (`GastroDiscount` ~2215) |
| Portal | `apps/api/src/modules/gastro/gastro-portal-discounts.service.ts` |
| Metrics / activate | `apps/api/src/modules/gastro/gastro-discount-metrics.service.ts` |
| Ownership | `apps/api/src/modules/gastro/gastro-ownership.service.ts` |
| Admin discounts | `apps/api/src/modules/admin/admin-gastro.service.ts` |
| Admin profiles | `apps/api/src/modules/admin/admin-profiles.service.ts` |
| Scanner | `apps/api/src/scanner/scanner-gastro-discount.service.ts` |
| Public | `apps/api/src/public/public-gastro-discounts.service.ts` |
| Dashboard | `apps/api/src/modules/gastro/gastro-dashboard.service.ts` |
| Shared schemas | `packages/shared/src/schemas/gastro-discounts.ts` |
| Expiry | `packages/shared/src/gastro-discount-expiry.ts` |
| QR | `packages/shared/src/gastro-discount-qr.ts` |
| Notifications | `apps/api/src/modules/notifications/user-notifications.service.ts` |
| Event notify pattern | `producer-event-status-notifications.service.ts` |
| Cron | `apps/api/src/modules/notifications/notifications-scheduler.service.ts` |
| Web portal | `apps/web/app/(portal)/gastro/descuentos/*` |
| Admin UI | `apps/web/components/admin/gastro/*` |
| Repos | `apps/web/repositories/ApiRepository.ts` |

### Endpoints actuales

| Método | Ruta |
|--------|------|
| GET/POST | `/gastro/discounts` |
| GET/PATCH | `/gastro/discounts/:id` |
| GET | `/gastro/discounts/:id/summary` |
| PATCH | `/gastro/discounts/:id/status` |
| GET | `/admin/gastronomicos/pending-discounts` |
| POST | `/admin/gastro-discount-tickets/:id/{approve,reject,cancel,...}` |
| GET | `/public/gastro-discounts`, `/public/gastro-locations/:id/discounts` |
| POST | `/public/gastro-discounts/:id/claim` |
| POST | `/scanner/gastro-discounts/validate` |
| POST | `/admin/profiles/gastro/:id/approve` \| `reject` |

---

## 3. Riesgos

| Riesgo | Detalle |
|--------|---------|
| Edit → `PENDING_REVIEW` | Sacaría el padre de scanner/discovery | **No hacer** |
| Mass-assign pending JSON | Cliente no debe persistir `id`/`status`/`tenantId`/claims | Allowlist server-side |
| Expiry duplicado | No crear segundo calendario; reutilizar helper AR | |
| Persist `EXPIRED` vs derivado | Enum no se escribe; UI/dashboard mezclan status y fechas | |
| Weekly recurring | No “vence” salvo `validTo` | No notificar expired cada día no-válido |
| `createdByUserId` RESTRICT | Courtesy campaign ya bloquea deep delete | Usar `SetNull` |
| `type`/`value` | Campos reales pero no editables en portal (siempre PERCENT/0) | No materiales |
| Inbox ACTIVE bypass | Histórico; no tocar en Etapa 5 | |
| Admin digest vencidos | Requeriría campaña/digest | **Diferir Etapa 8** |

---

## 4. Decisión A1 — pending edit (mínima)

**No** tabla `GastroDiscountVersion`. **No** bajar status del publicado.

Extensión de `GastroDiscount`:

```
pendingUpdate                  Json?
pendingUpdateSubmittedAt       DateTime?
pendingUpdateSubmittedByUserId String?  → User onDelete SetNull
```

### Semántica

```
ACTIVE (publicado)
  ├── campos actuales → discovery / scanner / claims
  └── pendingUpdate? → cola de moderación
```

| Caso | Comportamiento |
|-------|----------------|
| `ACTIVE`/`APPROVED` + cambio material | Conservar publicados; guardar pending; **no** cambiar status |
| `ACTIVE` + sin cambio material | No-op pending |
| `PENDING_REVIEW` / `COMMISSION_NEGOTIATION` | Edit in-place (flujo nuevo; no hay publicado) |
| `CANCELLED` | Edit in-place de contenido permitido hoy; activate/deactivate sigue siendo lifecycle |
| Otro perfil / otro tenant | Forbidden (ownership existente) |

Al aprobar edición: transacción → aplicar allowlist → `pendingUpdate = null` → mismo `discountId`. No regenerar `qrToken` / claims / shortCode.

Al rechazar: clear pending; publicado intacto.

Admin lista: pending **nuevo** = status `PENDING_REVIEW`/`COMMISSION_NEGOTIATION`; pending **edición** = `pendingUpdate != null` con status `ACTIVE`/`APPROVED`.

---

## 5. Campos materiales

Contrato real de `gastroDiscountUpdateSchema` (no hardcodear `type`/`value`):

| Campo published | Pending key | Material |
|-----------------|-------------|----------|
| `displayTitle` | `title` | sí |
| `summary` | `summary` | sí |
| `detail` | `detail` | sí |
| `submittedImageUrls` | `imageUrls` | sí |
| `validityMode` | `validityMode` | sí |
| `validWeekday` | `validWeekday` | sí |
| `validFrom` | `validFrom` | sí |
| `validTo` | `validTo` | sí |
| `discountDate` | `discountDate` | sí (legacy / derivado de rango) |

**No materiales / no van a pending:** `status`, `archivedAt`, `adminNotes`, `rejectionReason`, `qrToken`, `code`, `type`, `value`, `visibility`, `tenantId`, `gastroProfileId`, `eventId`, `createdBy*`, claims.

Helper: `packages/shared/src/gastro-discount-pending-update.ts`  
`getMaterialDiscountChanges` / `hasMaterialDiscountChanges` / `buildPendingUpdatePayload` (allowlist).

Comparación de fechas por calendar key AR, no por instante UTC.

---

## 6. Migración mínima

Una migración nullable/default-safe. Sin backfill destructivo. Filas existentes: pending null, `createdByOrigin = GASTRO`, `archivedAt` null.

Campos adicionales (mismos slices posteriores, una sola migración):

```
archivedAt        DateTime?
createdByOrigin   GastroDiscountOrigin @default(GASTRO)  // GASTRO | ADMIN
createdByUserId   String?  → User onDelete SetNull
```

Índices: `(pendingUpdateSubmittedAt)`, `(archivedAt)`, `(createdByOrigin)`.

AuditAction a agregar (enum Prisma + shared):

```
GASTRO_DISCOUNT_EDIT_SUBMITTED
GASTRO_DISCOUNT_EDIT_APPROVED
GASTRO_DISCOUNT_EDIT_REJECTED
GASTRO_DISCOUNT_ARCHIVED
GASTRO_DISCOUNT_UNARCHIVED
ADMIN_GASTRO_DISCOUNT_CREATED
GASTRO_PROFILE_APPROVED
GASTRO_PROFILE_REJECTED
```

`GASTRO_PROFILE_ACTIVATED` ya existe (suspend/activate). Approval de PENDING usa nombres nuevos para no mezclar.

---

## 7. Archive (A24)

`archivedAt` soft. **No** status `ARCHIVED` (preserva `EXPIRED`/`CANCELLED`/`REJECTED` + archivo).

Archivable por defecto: `EXPIRED` | `CANCELLED` | `REJECTED`, o `ACTIVE`/`APPROVED` **ya vencidos por fecha** (helper AR).

No archivar `PENDING_REVIEW` / `COMMISSION_NEGOTIATION` / `ACTIVE` vigente.

Unarchive: limpia `archivedAt`; no cambia status.

Archivar **no** borra claims, validations, metrics, AuditLog, QR, shortCode.

Listados: filtro `archivedAt` + secciones UI. Discovery/scanner ignoran archivados (y no-publicables).

---

## 8. Expiry persistido (A8)

Reutilizar `isGastroDiscountExpired` + ScheduleModule existente.

Job liviano (nuevo provider, mismo módulo de notificaciones/cron):

1. Candidatos: `status ∈ ACTIVE|APPROVED`, `archivedAt` null, `validityMode = DATE_RANGE` (o weekly con `validTo`).
2. Si helper AR dice vencido → `status = EXPIRED` (primer writer del enum).
3. Notificar gastro members del **mismo** `GastroProfile` con `referenceKey = gastro-discount-expired:{id}`.

No es un segundo mecanismo: el helper sigue siendo la regla; el cron **materializa** el enum y dispara delivery una vez.

Weekly sin `validTo`: no transiciona a `EXPIRED`.

**Admin digest consolidado de vencidos:** diferir a Etapa 8 (infra de campañas). Dashboard gastro `EXPIRED_DISCOUNTS` ya cubre alerta portal.

---

## 9. C1 — Admin create on-behalf

```
ADMIN → selecciona GastroProfile ACTIVE del tenant
      → POST /admin/gastronomicos/:profileId/descuentos
      → status ACTIVE + qrToken + displayImageUrls = submitted
      → createdByOrigin = ADMIN
      → createdByUserId = admin
      → AuditLog ADMIN_GASTRO_DISCOUNT_CREATED
```

**No** `ADMIN crea → PENDING → ADMIN se auto-aprueba`. El actor que modera es quien crea.

Gastro create: `createdByOrigin = GASTRO`, `PENDING_REVIEW`.

Perfil no ACTIVE / otro tenant / sin `publicEventId` → reject.

Nunca “primer local” arbitrario.

---

## 10. Notificaciones (A9 + Etapa 4)

Reutilizar motor. Kinds nuevos (evitar explosión; body distingue new vs edit):

| Kind | Evento |
|------|--------|
| `GASTRO_DISCOUNT_PENDING_REVIEW` | Nuevo enviado o edición material enviada |
| `GASTRO_DISCOUNT_APPROVED_BY_ADMIN` | Nuevo o edición aprobada |
| `GASTRO_DISCOUNT_REJECTED_BY_ADMIN` | Nuevo o edición rechazada |
| `GASTRO_DISCOUNT_EXPIRED` | Transición a vencido |
| `GASTRO_PROFILE_APPROVED_BY_ADMIN` | Local PENDING → ACTIVE |
| `GASTRO_PROFILE_REJECTED_BY_ADMIN` | Local PENDING → REJECTED |

Destinatarios: memberships `ACTIVE` del `GastroProfile` afectado (no otros locales de la misma cuenta).

Email null → skip EMAIL; IN_APP/PUSH según prefs.

Dedupe: `referenceKey` estable por evento lógico (`…:{discountId}:edit`, `…:{discountId}:create`, `gastro-discount-expired:{id}`, `gastro-profile-approved:{profileId}`).

Templates email: mínimo reutilizando layout de `PRODUCER_EVENT_*` (nuevos ids gastro). Sin fake email.

Admin expired digest: **no** en esta etapa.

---

## 11. Plan de slices

| Slice | Objetivo |
|-------|----------|
| **5.0** | Esta auditoría |
| **5.1** | Prisma + helper material + portal pending edit + tests util |
| **5.2** | Admin list/diff/approve/reject pending edit + UI |
| **5.3** | `archivedAt` + persist EXPIRED via cron + filtros portal/admin |
| **5.4** | Admin create on-behalf + origin |
| **5.5** | Notifications kinds + delivery + profile approval + expiry notify |
| **5.6** | UX copy portal/admin (publicado vs edición pendiente, tabs) |
| **5.7** | Builds, tests, closing técnico |

Notificaciones de 5.1–5.4 pueden quedar como hooks no-op hasta 5.5 si el wiring circular lo exige; preferir inyectar el servicio de lifecycle en 5.5 y llamar fire-and-forget desde approve/edit/expiry.

---

## 12. Fuera de alcance

QR Studio, cupones Actividades, WhatsApp, settlements, Payment/Getnet, `GastroOrganization`, motor genérico de cupones, digest admin Etapa 8, actualización de contextos globales, push, QA browser completo.

---

## 13. Builds slice 5.0

Sin cambios de código. Validar shared + api tras este doc.
