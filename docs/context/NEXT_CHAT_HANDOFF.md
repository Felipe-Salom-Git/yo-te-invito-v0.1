# Yo Te Invito — Next Chat Handoff

**Actualizado:** 2026-08-31 · Rama: `feat/v1-s03-api-foundation` · HEAD: ver `git log -1`

Punto de entrada operativo para **V3.3**. Detalle completo: `AI_ENTRYPOINT.md`, `PROJECT_CONTEXT.md`, `CONTEXT_PENDIENTES.md`.

---

## 1. Estado actual — V3.3

| Etapa | Estado |
|-------|--------|
| **Etapa 0 — Auditoría funcional/operativa** | ✅ Cerrada — `docs/audits/V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md` |
| **Etapa 1 — UX pública / mobile** | ✅ Código implementado (9 slices) |
| **Etapa 1 — QA manual** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 2 — Perfil usuario / Avatar** | ✅ Código implementado (4 slices) |
| **Etapa 2 — QA manual** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 3 — Scanner V3** | ✅ Código implementado (5 slices + auth hardening) |
| **Etapa 3 — QA manual / migración DB** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 4 — Gastro Multi-local + Approval** | ✅ Código implementado (6 slices + pre-cierre hardening) |
| **Etapa 4 — QA manual / DB smoke** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 5 — Descuentos Gastro V3** | ✅ Código implementado (7 slices + hardening `c91c205`) |
| **Etapa 5 — QA manual / DB smoke** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 6 — QR Studio** | ✅ Código implementado (slices 6.0–6.7 + hardening `de4e07d`) |
| **Etapa 6 — QA manual / DB smoke** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 7 — Actividades + Cupones QR** | ✅ Código implementado (slices 7.0–7.7 + 7.9 + hardening `a494274`; 7.8 skip Studio) |
| **Etapa 7 — QA manual / DB smoke / Scanner DB** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 8 — Campañas Email / WhatsApp** | ✅ Código implementado (slices 8.0–8.7 + hardening `39a8a0b`) |
| **Etapa 8 — QA manual / DB smoke / Redis / SMTP live** | ⏳ Pendiente — acumulado cierre global V3.3 |

**Checklist V3.3:** `docs/dev/Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md`

**Próxima etapa V3.3:** **Etapa 9 — Auditoría Económica / Conciliación**. No iniciar sin instrucción explícita.

---

## 2. Stack

| Capa | Tecnología |
|------|------------|
| Monorepo | pnpm + Nx |
| Web | Next.js 15 App Router, React, Tailwind, TanStack Query, NextAuth |
| API | NestJS, Prisma, PostgreSQL, Zod, BullMQ + Redis (emails) |
| Shared | `packages/shared` — schemas, enums, helpers |
| Scanner | PWA `apps/scanner` — **Yo Te Invito Scanner** |
| Auth | JWT + NextAuth; dev: `X-Dev-User-Id` |

---

## 3. Arquitectura

```txt
User → Next.js → ApiRepository → NestJS Controller → Service → Prisma → PostgreSQL
```

- **No** fetch directo desde componentes — usar repositories.
- Controllers: HTTP + Zod. Services: lógica. Prisma: persistencia.
- Tenant default público: `tenant-demo`.

---

## 4. Producción

| Componente | Detalle |
|------------|---------|
| VPS | Ubuntu DonWeb — SSH `deploy@…:5230` (`ssh yoteinvito`) |
| Procesos | systemd: `yti-web` (:3000), `yti-api` (:3001), `yti-scanner` (:3002) |
| Dominios | `yoteinvito.club`, `api.yoteinvito.club`, `scanner.yoteinvito.club` |

**Migraciones prod:** solo `npx prisma migrate deploy`. Incluye Etapa 3 + Etapa 5 + Etapa 6 + Etapa 7:
- `20260831120000_gastro_claim_short_code` (pgcrypto idempotente)
- `20260831130000_user_scanner_username`
- `20260831140000_gastro_discount_v3_lifecycle` (**no aplicada localmente** — PostgreSQL/Docker no disponible)
- `20260831150000_gastro_discount_visual_template` (**no aplicada localmente** — PostgreSQL/Docker no disponible)
- `20260831160000_activity_coupon_domain` (**no aplicada localmente** — PostgreSQL/Docker no disponible)
- `20260831170000_activity_coupon_claimed_notification` (**no aplicada localmente** — PostgreSQL/Docker no disponible)
- `20260831180000_user_marketing_preference` (**no aplicada localmente**)
- `20260831190000_admin_campaign_domain` (**no aplicada localmente**)
- `20260831200000_admin_operational_digest_log` (**no aplicada localmente**)

Runbook: `docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`.

---

## 5. V3.3 Etapa 8 — commits principales

```txt
9b4b7b5 docs(v3.3): audit campaign communications architecture
1858ec6 feat(v3.3): add marketing communication preferences
6bb50b4 feat(v3.3): add admin campaign domain
cb2d206 feat(v3.3): deliver admin email campaigns
7478074 feat(v3.3): add admin campaign management ui
d29b6bd feat(v3.3): prepare campaign whatsapp channel
96991c1 feat(v3.3): add admin expired benefits digest
e39bef4 docs(v3.3): close admin campaigns stage
39a8a0b fix(v3.3): harden campaign delivery lifecycle
```

(+ commit documental de contextos: `docs(v3.3): close admin campaigns context`)

---

## 6. Decisiones importantes (V3.3 Etapa 8 — Campañas)

| Tema | Regla |
|------|--------|
| **Transactional ≠ marketing** | `EmailQueueService` / `emails` + `UserNotificationsService` ≠ campañas. `NotificationDeliveryLog` no es tabla de campañas. |
| **Consent** | `UserMarketingPreference`; sin fila → no elegible; usuarios existentes **no** opt-in por defecto; sin backfill. |
| **Unsubscribe** | Token 64 hex scope EMAIL; `GET` read-only (`previewUnsubscribeByToken`); `POST` mutación idempotente; `/baja-promos?token=...`. |
| **Email campaigns** | Cola `campaign-emails` separada; worker revalida antes de enviar; `emailOptIn=false` bloquea marketing, **no** verification/claim QR/transaccionales. |
| **Cancel** | `cancelRequestedAt` revalidado en worker → `SKIPPED`/`CANCELLED_BY_ADMIN`; jobs encolados no se eliminan físicamente. |
| **Completion** | `refreshCampaign` → `finalizeCampaignStatus` → `COMPLETED`/`PARTIAL`/`FAILED`/`CANCELLED`. |
| **WhatsApp** | **NOT CONFIGURED** — provider-ready; `canSendWhatsAppCampaign()` → false; canal visible en Admin, send disabled. |
| **Digest vencidos** | Operativo (≠ marketing); cron **08:20 AR** (`EXPIRED_BENEFITS_DIGEST_TIMEZONE`); idempotencia diaria AR; flag `ADMIN_EXPIRED_BENEFITS_DIGEST_CRON_ENABLED`. |
| **Audit** | `CAMPAIGN_SEND_REQUESTED` sí; `CAMPAIGN_COMPLETED` desde worker **diferido** (requiere actorId real). |

Doc: `V3_3_STAGE_8_CAMPAIGNS_AUDIT.md`, `V3_3_STAGE_8_CAMPAIGNS_CLOSING.md`.

---

## 7. V3.3 Etapa 7 — commits principales

```txt
01aa1a8 docs(v3.3): audit activity coupons architecture
beaf71d refactor(v3.3): extract reusable coupon primitives
8331c77 feat(v3.3): add activity coupon domain
2c9a30f feat(v3.3): add activity coupon management
0529749 feat(v3.3): add activity coupon claims
ddcf7df feat(v3.3): validate activity coupons in scanner
ab56505 feat(v3.3): add activity coupon public ux
2e704cf feat(v3.3): add activity coupon metrics and notifications
fad396b docs(v3.3): close activity coupons stage
a494274 fix(v3.3): harden activity coupon scanner scope
```

Slice **7.8 skip deliberado** — custom Activity QR Studio diferido (no commit vacío).

(+ commit documental de contextos: `docs(v3.3): close activity coupons context`)

---

## 8. Decisiones importantes (V3.3 Etapa 7 — Actividades + Cupones)

| Tema | Regla |
|------|--------|
| **Dominio** | `GastroDiscount` ≠ `ActivityCoupon`. No existe `GenericCoupon`. |
| **Copy vs técnico** | Público **Actividades**; `Event.category = excursion`; rutas `/excursiones/*`. Sin migrar `excursion → activity`. |
| **Owner V1** | `ExcursionOperator` + `Event(excursion)`. Gestión de cupones **ADMIN only**. Sin portal operador / memberships. |
| **Lifecycle V1** | Admin create → `ACTIVE` + edit in-place (`ADMIN` = creador y moderador). `PENDING_REVIEW` / `pendingUpdate` reservados a futuro self-service. |
| **Claim** | 1 por `(couponId, email)`; duplicate ACTIVE reutiliza; USED/EXPIRED no re-emite. Sin QR maestro en el cupón. |
| **QR** | `yti:activity-coupon:v1:<couponId>:<token>` (≠ gastro, ≠ ticket). |
| **Short code** | Display `XXX-XXX`; lookup **solo** `ActivityCouponClaim` (nunca gastro+activity first-match). |
| **Scanner** | `parentProfileType = EXCURSION_OPERATOR`, `parentProfileId = ExcursionOperator.id`. **Operator-wide V1** (no Event / occurrence). Helper `canScannerAccessActivityCoupon`. |
| **Occurrence** | **No** FK a `EventOccurrence`. Scope = Event completo. |
| **Studio** | Fallback `ActivityCouponQrCard`. Custom Studio **diferido**. |
| **Notificaciones operador** | Diferidas (no hay membership operador). Claim: EMAIL `ACTIVITY_COUPON_QR` + IN_APP `ACTIVITY_COUPON_CLAIMED`. |

Doc: `V3_3_STAGE_7_ACTIVITY_COUPONS_AUDIT.md`, `V3_3_STAGE_7_ACTIVITY_COUPONS_CLOSING.md`.

---

## 9. V3.3 Etapa 6 — commits principales

```txt
4f3b07f docs(v3.3): audit gastro qr studio architecture
c228827 refactor(v3.3): extract reusable visual template primitives
19bc163 feat(v3.3): add gastro discount visual templates
214e4d9 feat(v3.3): render gastro discount qr templates
409da5e feat(v3.3): add gastro discount qr studio
47a9357 feat(v3.3): use discount templates in qr claims
feb6d1b feat(v3.3): add qr studio presets and admin preview
b3a0905 docs(v3.3): close gastro qr studio stage
de4e07d fix(v3.3): harden gastro qr studio canonical content
```

(+ commit documental de contextos: `docs(v3.3): close gastro qr studio context`)

---

## 10. Decisiones importantes (V3.3 Etapa 6 — QR Studio)

| Tema | Regla |
|------|--------|
| **Modelo** | `GastroDiscount` → 0..1 `GastroDiscountTemplate`. **No** se reutilizó Prisma `TicketTemplate` (tickets/productora + data URLs). |
| **Primitives** | Rects 0–1, capas, QR zone, drag/inspector, `TicketQrImage`, print browser — extraídos a shared; `TicketStudioClient` **no tocado**. |
| **Presentación ≠ seguridad** | Template no controla payload, `qrToken`, `discountId`, `claimId`, valor de `shortCode`, `tenantId`, `gastroProfileId`, `status`, `pendingUpdate`. |
| **Canónicos visibles** | Custom template exige QR zone + `discountValue` + `shortCode` + `discountTitle` DYNAMIC visibles (min w/h/font/opacity; sin rotation; no tapados). |
| **discountValue** | Solo `formatDiscountVisualBenefit(GastroDiscount.type, value)`. Compile borra `content` de DYNAMIC. |
| **shortCode** | Studio placeholder `ABC-123`; claim real = `GastroDiscountClaim.shortCode`. |
| **Fallback** | Sin template / inválido / mapping fail / React error → `GastroDiscountQrCard`. |
| **Presets** | Clásico, Minimal, Premium, Promoción — JSON constantes; aplicar = snapshot editable. |
| **Ownership** | `discountId` → `gastroProfileId` → `assertCanOperateProfile`. `?profileId=` no autoriza. |
| **GCS** | `POST /uploads/public-image` scope `gastro`, `entityId` = `GastroProfile.id`, purposes `gallery`/`logo`, HTTPS. |
| **Admin** | Preview en UI; PUT/DELETE admin por API. Editor Admin completo **no** implementado (deuda, no crítica). |

Doc: `V3_3_STAGE_6_QR_STUDIO_AUDIT.md`, `V3_3_STAGE_6_QR_STUDIO_CLOSING.md`.

---

## 11. V3.3 Etapa 5 — commits principales

```txt
a757c76 docs(v3.3): audit gastro discounts v3 lifecycle
cb1dbaf feat(v3.3): add gastro discount pending edits
a2f308d feat(v3.3): moderate gastro discount edits
46b7773 feat(v3.3): add gastro discount history and archive
7a4b087 feat(v3.3): allow admin gastro discount creation
a18d298 feat(v3.3): add gastro lifecycle notifications
eb344e1 feat(v3.3): refine gastro discount lifecycle ux
692f454 docs(v3.3): close gastro discounts stage
c91c205 fix(v3.3): harden gastro discount reapproval lifecycle
```

(+ commit documental de contextos: `docs(v3.3): close gastro discounts stage context`)

---

## 12. Decisiones importantes (V3.3 Etapa 5 — Descuentos Gastro V3)

| Tema | Regla |
|------|--------|
| **Publicado + pendingUpdate** | `ACTIVE`/`APPROVED` publicado + JSON `pendingUpdate` opcional. No existe `GastroDiscountVersion`. |
| **Edición material** | No cambia el publicado. Flujo: gastro edita → pending → admin revisa. |
| **Campos materiales** | `title`, `summary`, `detail`, `imageUrls`, **`type`**, **`value`**, `validityMode`, `validWeekday`, `validFrom`, `validTo`, `discountDate` (`c91c205`) |
| **Allowlist** | Pending nunca toca `id`, `tenantId`, `gastroProfileId`, `status`, `qrToken`, `createdAt`, origin/creator, claims, validations |
| **Approve** | Allowlist server-side → promoción transaccional → pending cleared → audit + notificación |
| **Reject** | Pending cleared; publicado intacto; audit + notificación |
| **Claims / QR / scanner** | Mismo `discountId`, claims, tokens, QR, shortCode, validations, metrics. Scanner sigue `ACTIVE`\|`APPROVED`. |
| **Archive soft** | `archivedAt`; no borrado físico. Conserva claims/validations/metrics/audit. |
| **Expiry cron** | `GastroDiscountExpiryService`; flag `GASTRO_DISCOUNT_EXPIRY_CRON_ENABLED` ON salvo `"false"` |
| **Origin** | Gastro create → `PENDING_REVIEW` + `GASTRO`; admin create → `ACTIVE` + `ADMIN` |
| **Admin create** | `POST /admin/gastronomicos/:profileId/descuentos` — perfil concreto, nunca “primer local” |
| **Notificaciones** | Kinds descuento + perfil Gastro; create/edit vía `referenceKey` `:create`/`:edit` |
| **Digest admin expired** | Diferido **Etapa 8** (no bug de Etapa 5) |

Doc: `V3_3_STAGE_5_GASTRO_DISCOUNTS_AUDIT.md`, `V3_3_STAGE_5_GASTRO_DISCOUNTS_CLOSING.md`.

---

## 13. V3.3 Etapa 4 — commits principales

```txt
612fd2d docs(v3.3): design gastro multi-local architecture
f582517 feat(v3.3): support multiple gastro locations per account
3d7481d feat(v3.3): add multi-location gastro portal
d037b4c feat(v3.3): add gastro location approval workflow
4135e41 refactor(v3.3): scope gastro operations by location
6b0a96b docs(v3.3): close gastro multi-location stage
ea79aa6 fix(v3.3): harden gastro multi-location ownership
```

(+ commit documental de contextos tras este handoff)

---

## 14. Decisiones importantes (V3.3 Etapa 4 — Gastro Multi-local)

| Tema | Regla |
|------|-------|
| **Unidad operativa** | `GastroProfile` = propuesta/local público independiente (estado, publicación, ubicación, contactos, scanners, descuentos propios) |
| **Sin GastroOrganization** | No se introduce entidad organización ni ubicación física compartida — N memberships ya soportado |
| **N perfiles por cuenta** | `User` → N `UserGastroMembership` → N `GastroProfile` |
| **Approval** | Nuevo perfil (registro o local adicional) → `PENDING`; admin approve → `ACTIVE` + sync público; reject → `REJECTED` |
| **Portal con PENDING** | Usuario puede autenticarse y editar perfil PENDING; discovery/operación pública requiere ACTIVE |
| **Copy/snapshot** | `copyFromProfileId` prefill ubicación+contactos; **no** vincula permanentemente; imágenes/galería **no** se copian |
| **Ownership** | `GastroOwnershipService` — listar, assert, resolve create; tenant/membership server-side |
| **`?profileId=`** | Contexto de navegación portal (listado, crear, dashboard, scanners); **no** fuente de autorización |
| **Descuentos resource** | `discountId` → `GastroDiscount.gastroProfileId` → `assertCanOperateProfile` (hardening `ea79aa6`) |
| **Create discount** | 1 ACTIVE → auto-select; N ACTIVE → `profileId` obligatorio |
| **Scanner scope** | `ScannerAccount.parentProfileId` → `GastroProfile`; picker en portal si N perfiles |
| **Notificaciones approval** | Cerrado en **Etapa 5 (A9)** — `GASTRO_PROFILE_APPROVED_BY_ADMIN` / `REJECTED_BY_ADMIN` |
| **Nullable email** | `user-contact.util.ts`; display sin fake email; `requireUserEmail` donde obligatorio; skip delivery si null |

Doc: `V3_3_STAGE_4_GASTRO_MULTI_LOCAL_ARCHITECTURE.md`, `V3_3_STAGE_4_GASTRO_MULTI_LOCAL_CLOSING.md`.

---

## 15. V3.3 Etapa 3 — Scanner (referencia)

| Tema | Regla |
|------|-------|
| **Auth Scanner nuevo** | `User.username` global unique + password; `email: null` |
| **Bypass verification** | Solo `Role.SCANNER` (`198fc38`) |

Doc: `V3_3_STAGE_3_SCANNER_V3_CLOSING.md`.

---

## 16. V3.3 Etapa 2 — Avatar (referencia)

Doc: `V3_3_STAGE_2_USER_AVATAR_CLOSING.md`.

---

## 17. V3.3 Etapa 1 — UX pública (referencia)

Doc: `V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md`.

---

## 18. V3.2 — estado previo (sin cerrar QA)

Código slices 0–11 cerrado. Hotfixes 2026-08: `15f2776`, `b8dc571`, `ff6f8e0`, `920c5d7`.

**Pendiente V3.2:** deploy VPS + QA prod. **No sustituido por V3.3.**

---

## 19. Pendientes priorizados

1. **QA manual / integración global V3.3** — Etapas 1–8 acumuladas (incl. Campañas: opt-in/out, unsubscribe GET/POST, draft, send, cancel, digest, WhatsApp disabled).
2. **Migración deploy + smoke DB** — `prisma migrate deploy` (acumula Etapa 3–8 incl. `20260831180000_user_marketing_preference`, `20260831190000_admin_campaign_domain`, `20260831200000_admin_operational_digest_log`). **NO EJECUTADO** — P1001 `localhost:5433`.
3. **Redis integration** — worker `campaign-emails` end-to-end **NO EJECUTADO**.
4. **Scanner DB integration** — `test:gastro-discount-scan` y Activity vs PostgreSQL **NO EJECUTADO**. `test:activity-coupon-scan` PASS = dispatch/unit, no integración DB.
5. **SMTP live smoke** — campaña masiva real **NO EJECUTADO** (a propósito).
6. **QA prod V3.2** — cache, roles, auth resend, horarios.
7. Deploy VPS si commits V3.2/V3.3 no están en prod.
8. Deuda producto: custom QR Studio Activity, operator self-service, `CAMPAIGN_COMPLETED` audit, WhatsApp provider adapter, Admin test-send, custom campaign image GCS.

Detalle: `CONTEXT_PENDIENTES.md`.

---

## 20. Comandos de validación

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter scanner run build
pnpm --filter web run build
pnpm --filter api exec prisma validate
pnpm --filter api run test:marketing-preferences
pnpm --filter api run test:admin-campaign-domain
pnpm --filter api run test:admin-campaign-delivery
pnpm --filter api run test:admin-expired-benefits-digest
pnpm --filter api run test:activity-coupon-domain
pnpm --filter api run test:activity-coupon-ownership
pnpm --filter api run test:activity-coupon-claim
pnpm --filter api run test:activity-coupon-qr
pnpm --filter api run test:activity-coupon-metrics
pnpm --filter api run test:activity-coupon-scan
pnpm --filter api run test:gastro-discount-expiry
pnpm --filter api run test:gastro-discount-qr
pnpm --filter api run test:gastro-discount-pending-edit
pnpm --filter api run test:gastro-discount-edit-moderation
pnpm --filter api run test:gastro-discount-archive
pnpm --filter api run test:gastro-discount-origin
pnpm --filter api run test:gastro-lifecycle-notifications
pnpm --filter api run test:gastro-multi-local
pnpm --filter api run test:ticket-template-schema
pnpm --filter api run test:discount-visual-template
pnpm --filter api run test:gastro-discount-visual-persist
pnpm --filter api run test:discount-visual-render
pnpm --filter api run test:scanner-manual-short-code
```

`test:activity-coupon-scan` PASS = dispatch/unit scope, **≠** DB integration.  
`test:gastro-discount-scan` — **NO EJECUTADO** (PostgreSQL no disponible). No marcar PASS.

---

## 21. Próximo paso recomendado

1. Iniciar **V3.3 Etapa 9 — Auditoría Económica / Conciliación** cuando se indique. **No iniciar ahora.**
2. QA manual + migración DB + Redis/SMTP smokes al cerrar V3.3 globalmente.
