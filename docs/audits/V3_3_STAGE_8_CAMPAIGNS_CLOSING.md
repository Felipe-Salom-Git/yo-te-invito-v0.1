# V3.3 — Etapa 8 — Cierre Campañas Admin Email / WhatsApp

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD:** `39a8a0b` (hardening) + commit documental context  
**Auditoría:** [`V3_3_STAGE_8_CAMPAIGNS_AUDIT.md`](./V3_3_STAGE_8_CAMPAIGNS_AUDIT.md)

**Estado código:** implementado + hardening pre-cierre. DB smoke / Redis worker / SMTP live / QA manual: pendientes.

---

## 0. Hardening pre-cierre (2026-08-31)

### Unsubscribe GET read-only

| Método | Comportamiento |
|--------|----------------|
| `GET /public/marketing/unsubscribe?token=` | **Solo lectura.** Valida token y devuelve `{ ok, valid, emailOptIn, alreadyUnsubscribed }`. **No** escribe `emailOptIn` ni `emailOptOutAt`. |
| `POST /public/marketing/unsubscribe?token=` | **Mutación.** `emailOptIn=false`, `emailOptOutAt=now()`, `source=UNSUBSCRIBE`. Idempotente: segundo POST → `alreadyUnsubscribed: true`. |

Web `/baja-promos?token=...`:

1. `GET` al cargar (validación / preview)
2. Si sigue opt-in → pantalla de confirmación
3. Usuario confirma → `POST`
4. Éxito o “ya estabas dado de baja”

Motivo: scanners de email, previews y prefetch no deben disparar opt-out.

Helpers puros en shared: `buildMarketingUnsubscribePreview`, `buildMarketingUnsubscribeResult`.

### Digest timezone determinística

- Cron prod: `20 8 * * *` — **08:20** en `America/Argentina/Buenos_Aires` (`EXPIRED_BENEFITS_DIGEST_TIMEZONE`, misma que `GASTRO_DISCOUNT_TIMEZONE`).
- Cron dev: `*/30 * * * *` en la misma timezone.
- `@Cron(..., { timeZone: EXPIRED_BENEFITS_DIGEST_TIMEZONE })` en `AdminExpiredBenefitsDigestService`.
- `expiredBenefitsDigestKey()` usa calendario AR (`getGastroDiscountCalendarKey`), no UTC `toISOString().slice(0,10)`.
- `ADMIN_EXPIRED_BENEFITS_DIGEST_CRON_ENABLED`: omitida o ≠ `"false"` → activo; `"false"` → skip.

### Cancel worker guard

`evaluateCampaignEmailDelivery` revalida `cancelRequestedAt` antes de enviar → `SKIPPED` / `CANCELLED_BY_ADMIN`. Deliveries ya `SENT` → `already_sent` (no retracta). Jobs BullMQ encolados pueden ejecutarse; el worker hace skip (no se cancelan jobs físicamente).

`refreshCampaign` agrega cuando `queued=0`: `COMPLETED` | `PARTIAL` | `FAILED` | `CANCELLED` vía `finalizeCampaignStatus`. Bulk-skip de `QUEUED` restantes si `cancelRequestedAt` al drenar.

### Audit `CAMPAIGN_COMPLETED`

**Diferido.** `AuditService.logAction` exige `actorId` real; el worker no tiene actor sistema. `CAMPAIGN_SEND_REQUESTED` sí se audita al enviar. Estado terminal visible en `AdminCampaign.status`.

---

## 1. Email architecture

```
Transaccional / crítico
  dominio → EmailQueueService (BullMQ queue `emails`) → EmailService → MailProvider (SMTP DonWeb / Resend)

Marketing EMAIL
  Admin Send → AdminCampaign DRAFT→SENDING (atomic)
    → audience resolve + AdminCampaignDelivery QUEUED
    → CampaignEmailQueueService (BullMQ queue `campaign-emails`)
    → worker revalida consent/user/content
    → EmailService.send(template ADMIN_CAMPAIGN)
    → SENT | SKIPPED | FAILED
    → COMPLETED | PARTIAL | FAILED | CANCELLED

Operativo Admin (digest vencidos)
  AdminExpiredBenefitsDigestService cron
    → EmailQueueService.enqueueTemplate(ADMIN_EXPIRED_BENEFITS_DIGEST)
    → destinatarios Role.ADMIN con email
    → NO lee UserMarketingPreference
```

`UserNotificationsService` **no** es campaign engine.  
`NotificationDeliveryLog` **no** es tabla de campañas.

Cola campañas: `attempts: 3`, backoff exponencial 4s, `limiter max: 4 / 1000ms`, `concurrency: 2`, `jobId: campaign-delivery:{deliveryId}`.

Prod sin `REDIS_URL`: `CAMPAIGN_QUEUE_UNAVAILABLE` (no for-loop SMTP en el HTTP). Dev sin Redis: process sync.

---

## 2. Transactional vs marketing

| Clase | Consentimiento marketing | Ejemplos |
|-------|--------------------------|----------|
| Transaccional | **No aplica** | verify email, claim QR Gastro/Actividad, transfer, seguridad |
| Engagement opcional | `emailNotificationsEnabled` (otro flag) | recordatorio 24h, follows |
| Operativo Admin | **No aplica** | digest vencidos, `ADMIN_*` excepto `ADMIN_CAMPAIGN` |
| Campaña comercial | `UserMarketingPreference.emailOptIn === true` | “Novedades de esta semana” |

`emailNotificationsEnabled` **no** es opt-in marketing. Opt-out marketing **no** apaga claim QR ni verificación.

`ADMIN_CAMPAIGN` no usa `MAIL_OPERATIONS_TO` por default (`sendTemplate` lo excluye). El digest sí es operacional.

---

## 3. Consent model

Modelo `UserMarketingPreference` (1:1 User, Cascade al borrar User):

| Campo | Rol |
|-------|-----|
| `emailOptIn` / `emailOptInAt` / `emailOptOutAt` | EMAIL |
| `emailUnsubscribeToken` | 32 bytes hex, único |
| `whatsappOptIn` / timestamps | WA, independiente |
| `source` | `ACCOUNT` \| `UNSUBSCRIBE` \| `ADMIN` |

Canales independientes. Ausencia de fila = **no elegible**.

Elegibilidad EMAIL (todas):

1. Fila con `emailOptIn === true`
2. `User.status === ACTIVE`
3. `role !== SCANNER`
4. `email` no null/blank
5. `emailVerified` set
6. mismo `tenantId`
7. revalidación en el worker

WhatsApp opt-in vía API: rechazado mientras no hay adapter de envío real. UI `/me/account` toggle WA disabled / Próximamente.

---

## 4. Existing users default

**No opt-in.** Migración no backfillea. `emailOptIn` default `false`. Sin fila → equivalente a false.

No se infiere desde cuenta, `emailVerified`, claims, compras ni TyC generales.

---

## 5. Unsubscribe

| Pieza | Valor |
|-------|--------|
| Web pública | `/baja-promos?token=` — GET preview + confirmación + POST |
| API preview | `GET /public/marketing/unsubscribe?token=` — **read-only** |
| API mutation | `POST /public/marketing/unsubscribe?token=` — opt-out |
| Token | `^[a-f0-9]{64}$`, no userId/email |
| POST efecto | `emailOptIn=false`, `emailOptOutAt=now()`, `source=UNSUBSCRIBE` |
| POST idempotente | `alreadyUnsubscribed: true` si ya opt-out |
| No afecta | verify, claim QR, tickets, seguridad |

Re-subscribe: `/me/account` → Comunicaciones. Sin double-opt-in V1.

Campaign EMAIL incluye CTA secundario “Darse de baja” + copy de que no afecta transaccional.

---

## 6. Campaign models

```
AdminCampaign
  tenantId, createdByUserId (SetNull)
  status, channel, contentType, contentId, contentSnapshot
  audienceKind, audienceFilter
  subject, headline, body, ctaLabel, ctaUrl
  queuedCount, sentCount, skippedCount, failedCount
  startedAt, completedAt, cancelRequestedAt, archivedAt

AdminCampaignDelivery
  tenantId, campaignId, userId (SetNull)
  channel, status, skipReason, errorCode, providerMessageId, targetHint
  unique (campaignId, userId, channel)
```

PII: `targetHint` enmascarado (`j***@dominio`). No se guarda body por recipient.

---

## 7. Lifecycle

```
DRAFT → SENDING → COMPLETED | PARTIAL | FAILED
DRAFT → CANCELLED
SENDING + cancelRequestedAt → workers SKIPPED CANCELLED_BY_ADMIN
  (ya SENT no se retracta)
finished → archive (archivedAt); no hard-delete
DRAFT → hard delete permitido
```

Send atómico: `updateMany` `status=DRAFT` → `SENDING`. Segundo admin → `CAMPAIGN_ALREADY_SENDING`.

No `scheduledAt` V1.

---

## 8. Content types

`GASTRO_DISCOUNT` | `ACTIVITY_COUPON` | `EVENT` | `EXCURSION`

Activity = `Event.category = excursion`. No hay tipo `ACTIVITY` duplicado.

Elegibilidad: PUBLIC/ACTIVE-APPROVED, no archived, no expired (calendario compartido), evento `APPROVED` + visibilidad pública. Beneficio canónico: `formatCouponVisualBenefit`. Copy editorial no overridea el %.

CTA: URL canónica HTTPS (HTTP solo localhost). Paths: `/descuentos/{id}`, `/excursiones/cupones/{id}`, `/events/{id}`, `/excursiones/{id}`.

Al send: snapshot de presentación. Worker revalida; contenido ya no elegible → SKIPPED `CONTENT_NOT_ELIGIBLE`. Send HTTP también rechaza si el recurso expiró antes del click Enviar (`CAMPAIGN_CONTENT_NOT_ELIGIBLE`).

---

## 9. Segmentation

`ALL_ELIGIBLE` | `CITY` | `FAVORITE_CATEGORY` | `CONTENT_CLAIMANTS`

Solo users del tenant con opt-in EMAIL. Un envío por usuario (email unique por tenant). Sin filtros sensibles.

Preview `eligibleCount` es estimación; el worker reevalúa.

---

## 10. BullMQ / idempotence

| Pieza | Detalle |
|-------|---------|
| Queue | `campaign-emails` (no `emails`) |
| jobId | `campaign-delivery:{deliveryId}` |
| Unique DB | `(campaignId, userId, channel)` |
| SENT | worker no-op |
| Retry | solo `retryable` SMTP; no `SMTP_NOT_CONFIGURED` |
| Cancel | no encola de más; QUEUED restante SKIPPED |

---

## 11. Delivery statuses / metrics

`QUEUED` | `SENT` | `SKIPPED` | `FAILED`

**SENT = accepted by MailProvider / SMTP.** No delivered/opened/clicked. Sin tracking pixel.

Admin ve: queued, sent, skipped, failed.

Errores persistidos: código corto sanitizado (sin password/token).

---

## 12. Admin UI

Rutas:

- `/admin/campanas` listado
- `/admin/campanas/nueva` draft + picker + canal + segmento + copy
- `/admin/campanas/[id]` preview, confirmación “Enviar a N”, resultados, deliveries paginadas

Nav: `portalNavConfig` → **Campañas**. Dashboard: acceso operativo.

Arquitectura: UI → TanStack Query → `AdminCampaignsRepo` → `ApiRepository` → `GET/POST /admin/campaigns`. **Sin fetch directo.**

API Admin: `JwtOrDevAuthGuard` + `RolesGuard` + `RequireRole(ADMIN)`.

WhatsApp: canal visible, Send disabled, copy “proveedor no configurado”.

---

## 13. WhatsApp

```
NOT CONFIGURED — provider pending
```

No hay Meta Cloud API, Twilio ni BSP en el repo. No se instaló SDK. No `wa.me` masivo.

`canSendWhatsAppCampaign()` = **siempre false** en V3.3 (el env `WHATSAPP_CAMPAIGN_PROVIDER` **no** habilita send).  
`sendCampaignWhatsApp()` → `WHATSAPP_PROVIDER_NOT_CONFIGURED`.  
`GET /admin/campaigns/channel-status` → `{ status: NOT_CONFIGURED, sendEnabled: false }`.

User.phone / teléfonos Gastro-Producer **no** se usan como target.

---

## 14. Expired digest

**Implementado.** Operativo, **no** campaña.

- Cron prod `20 8 * * *` con `timeZone: America/Argentina/Buenos_Aires` (`EXPIRED_BENEFITS_DIGEST_TIMEZONE` = `GASTRO_DISCOUNT_TIMEZONE`). Dev `*/30 * * * *` (misma TZ).
- Flag `ADMIN_EXPIRED_BENEFITS_DIGEST_CRON_ENABLED=false` desactiva.
- Ventana: `EXPIRED` + `updatedAt` últimas 24h, GastroDiscount y ActivityCoupon, no archivados.
- Destinatarios: `Role.ADMIN` + `ACTIVE` + `email != null` del tenant. Skip email null. No hardcode.
- Idempotencia: `AdminOperationalDigestLog` unique `(tenantId, kind, digestKey, recipientUserId)`, `digestKey` = fecha calendario AR (`getGastroDiscountCalendarKey`).
- Template `ADMIN_EXPIRED_BENEFITS_DIGEST` **sin** unsubscribe marketing.
- Si la ventana está vacía: no envía.

---

## 15. Privacy / tenant / deep delete

Campañas y audience scoped por `tenantId`. Admin promociona contenido del tenant, no hace falta ownership Gastro individual.

Deep delete User: `createdByUserId` SetNull, delivery `userId` SetNull, digest recipient SetNull. History se conserva. Preference Cascade.

---

## 16. Builds

| Package | Resultado |
|---------|-----------|
| `pnpm --filter shared run build` | PASS |
| `pnpm --filter api run build` | PASS |
| `pnpm --filter web run build` | PASS |
| `pnpm --filter scanner run build` | PASS (sin cambios de producto) |
| `pnpm --filter api exec prisma validate` | PASS |

---

## 17. Tests

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api run test:marketing-preferences` | PASS (GET preview / POST idempotence) |
| `pnpm --filter api run test:admin-campaign-domain` | PASS |
| `pnpm --filter api run test:admin-campaign-delivery` | PASS (cancel guard + terminal aggregation) |
| `pnpm --filter api run test:admin-expired-benefits-digest` | PASS (AR timezone + digest key) |
| `pnpm --filter api run test:gastro-discount-qr` | PASS |
| `pnpm --filter api run test:activity-coupon-qr` | PASS |
| `pnpm --filter api run test:activity-coupon-claim` | PASS |

Claim QR / verification **no** leen marketing opt-in (helpers + claim email gate `shouldSendActivityCouponClaimEmail(email)`).

---

## 18. Smokes

| Smoke | Resultado |
|-------|-----------|
| DB migrate apply | **NO EJECUTADO** — PostgreSQL `localhost:5433` P1001 |
| Redis / BullMQ worker integration | **NO EJECUTADO** — `REDIS_URL` no usado / Redis no verificado |
| SMTP live / campaña masiva | **NO EJECUTADO** (a propósito). HTML cubierto por renderer unitario; `smoke:email-template` con `ADMIN_CAMPAIGN` queda disponible a dirección controlada |
| QA manual global | Pendiente |

---

## 19. Migrations (escritas, no aplicadas localmente)

| Timestamp | Contenido |
|-----------|-----------|
| `20260831180000_user_marketing_preference` | `UserMarketingPreference` |
| `20260831190000_admin_campaign_domain` | `AdminCampaign*` + enums + `AuditAction` CAMPAIGN_* |
| `20260831200000_admin_operational_digest_log` | `AdminOperationalDigestLog` |

Ninguna convierte usuarios existentes en opt-in.

---

## 20. QA pendiente (no ejecutar ahora)

Preferences opt-in/out, unsubscribe público, draft, content picker, segmento, preview, confirm send, resultados, contenido inválido/expirado, email recibido + CTA + footer baja, mobile Admin, WhatsApp disabled.

---

## 21. Debts reales

| Debt | Nota |
|------|------|
| Migraciones no aplicadas en este entorno | Postgres caído |
| Worker Redis no ejercitado end-to-end | Sin Redis local verificado |
| `CAMPAIGN_COMPLETED` audit desde worker | Diferido — requiere actorId; status en campaña |
| Test send al Admin actor | Diferido; `smoke:email-template` cubre HTML |
| Imagen custom GCS de campaña | Diferido; se usa imagen canónica HTTPS del recurso |
| Adapter WhatsApp real | Pendiente decisión de proveedor |
| `User.phone` E.164 | No hace falta hasta WA real |
| `scheduledAt` | Fuera de V1 |

---

## 22. Commits Etapa 8

| Hash | Mensaje |
|------|---------|
| `9b4b7b5` | `docs(v3.3): audit campaign communications architecture` |
| `1858ec6` | `feat(v3.3): add marketing communication preferences` |
| `6bb50b4` | `feat(v3.3): add admin campaign domain` |
| `cb2d206` | `feat(v3.3): deliver admin email campaigns` |
| `7478074` | `feat(v3.3): add admin campaign management ui` |
| `d29b6bd` | `feat(v3.3): prepare campaign whatsapp channel` |
| `96991c1` | `feat(v3.3): add admin expired benefits digest` |
| `e39bef4` | `docs(v3.3): close admin campaigns stage` |
| `39a8a0b` | `fix(v3.3): harden campaign delivery lifecycle` |

---

## 23. Fuera de alcance (cumplido)

WhatsApp Web / wa.me blast, tracking pixels, opens/clicks, A/B, journeys, CRM, AI copy, settlement, payments, self-service Gastro/Producer, Etapa 9, scheduler calendar.
