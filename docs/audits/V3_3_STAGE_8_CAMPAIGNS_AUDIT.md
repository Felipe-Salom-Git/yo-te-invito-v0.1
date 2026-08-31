# V3.3 — Etapa 8 — Auditoría Campañas Admin Email / WhatsApp

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD al auditar:** `828ae11` (`docs(v3.3): close activity coupons context`)  
**Slice:** 8.0 (solo auditoría + decisiones; sin Prisma ni código de producto)

Checklist origen: **C2** — `Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md` § C2.  
Deuda Etapa 5: digest Admin de beneficios vencidos (operativo, **no** marketing).

**No** actualizar contextos globales. **No** push. **No** Etapa 9.

---

## 0. Principio no negociable

```
NOTIFICACIÓN TRANSACCIONAL  ≠  CAMPAÑA COMERCIAL
```

| Clase | Motor | Consentimiento marketing | Ejemplos |
|-------|--------|--------------------------|----------|
| Transaccional / crítico | dominio + `EmailQueueService` / `UserNotificationsService.deliver()` | **No aplica** | `AUTH_VERIFY_EMAIL`, claim QR gastro/actividad, transferencias, seguridad |
| Operativo / engagement opcional | `deliver()` + `emailNotificationsEnabled` | **No es marketing** | recordatorio 24h, favoritos, follows, reviews |
| Operativo Admin interno | `MAIL_OPERATIONS_TO` / `Role.ADMIN` | **No es marketing** | digest vencidos, `ADMIN_*` |
| Campaña comercial | **motor nuevo** `AdminCampaign` | **Opt-in explícito por canal** | “Nuevos descuentos de esta semana” |

`UserNotificationsService` **no** se convierte en campaign engine.  
`NotificationDeliveryLog` **no** es tabla de campañas (no tiene `campaignId`; unique `(userId, kind, referenceKey, channel)` atado a `NotificationKind`).  
`GastroCourtesyCampaign` **no** se reutiliza (cortesía QR de un Gastro dueño, no blast Admin).  
`emailNotificationsEnabled` **no** es opt-in marketing (es engagement transaccional opcional).

TyC / privacy actuales (`01_TERMINOS…`, `02_POLITICA_DE_PRIVACIDAD.md` §4–5) mencionan promociones de forma genérica y “mecanismos de baja **cuando corresponda**”. Signup (`register-wizard-copy.ts`) **no** pide consentimiento comercial. **No hay opt-in marketing implementado. No se infiere retrospectivamente.**

---

## 1. Infraestructura email (reutilizar)

| Pieza | Path | Uso Etapa 8 |
|-------|------|-------------|
| `EmailService` / `MailProvider` | `apps/api/src/email/` | Envío real (SMTP DonWeb o Resend según `MAIL_PROVIDER`) |
| `EmailQueueService` | cola BullMQ `'emails'` | **Transaccional/operativo.** Campañas **no** saturan esta cola |
| Layout | `renderBaseEmailLayout` + `escapeHtml` | Template oficial campaña |
| Registry | `EMAIL_TEMPLATE_IDS` (46 ids) | Agregar `ADMIN_CAMPAIGN` + `ADMIN_EXPIRED_BENEFITS_DIGEST` |
| Base URL CTAs | `WEB_APP_URL` (`getWebAppBaseUrl` / `referral-checkout-url.ts`) | HTTPS interno |
| Smokes | `smoke:email`, `smoke:email-template` | No disparar campaña masiva real |

**No hay rate limit** en `EmailQueueService` (sin `attempts`/`limiter`). Riesgo documentado en `EMAILS_ARCHITECTURE.md`.

**Decisión cola campañas:** queue BullMQ **separada** `'campaign-emails'`.

- Reutiliza `EmailService.send` / mismo `MailProvider`.
- `attempts: 3`, backoff exponencial, `limiter` conservador (p. ej. `max: 4`, `duration: 1000`).
- Prioridad: transaccional en `'emails'` no espera a un blast.
- Si `REDIS_URL` ausente: fallback sync **solo** para test/dev; Admin send en prod espera Redis (si no hay Redis → send rechazado con error claro, no loop SMTP en el HTTP).

---

## 2. WhatsApp — estado real

| Check | Resultado |
|-------|-----------|
| Twilio / Meta Cloud API / BSP en `package.json` | **No** |
| Servicio server-side de envío | **No** |
| `wa.me` | Solo CTAs de contacto (rental/gastro/hotel/excursión). **No** es canal de campaña |

**Decisión:** `channel = WHATSAPP` existe en dominio. Envío real **bloqueado** con `PROVIDER_NOT_CONFIGURED`. Admin no puede Send WhatsApp. **No** instalar SDK. **No** `wa.me` masivo. **No** Selenium.

V1 no recolecta opt-in WhatsApp activo en UI (toggle **disabled / Próximamente**). Campos de consentimiento WA existen para no rediseñar el modelo.

`User.phone` es `String?` libre, **sin** E.164. Teléfonos de `GastroProfile.contactPhone`, `ProducerProfile.whatsapp`, etc. **no** son targets personales. No se usan en campañas V1.

---

## 3. Usuario / email / preferencias

| Hecho | Evidencia |
|-------|-----------|
| `User.email` | `String?`, `@@unique([tenantId, email])` |
| `User.emailVerified` | `DateTime?` |
| `User.phone` | `String?` no normalizado |
| `User.status` | `ACTIVE` \| `SUSPENDED` \| `DELETED` |
| `User.role` | incluye `SCANNER` (a menudo `email == null`) |
| Preferencias | JSON `User.preferences` — ciudades, categorías, `emailNotificationsEnabled`, push kinds |
| Legal | `UserLegalAcceptance` contextos SIGNUP/CHECKOUT/… — **no** marketing |
| Unsubscribe email | **No existe** (solo push browser) |

**Campaña EMAIL exige (todas):**

1. Fila `UserMarketingPreference` con `emailOptIn === true` y `emailOptOutAt == null`
2. `User.status === ACTIVE` (no `DELETED` / `SUSPENDED`)
3. `User.role !== SCANNER`
4. `email != null` y no blank
5. `emailVerified != null`
6. Mismo `tenantId` que la campaña
7. Revalidación en el **worker**, no solo en el snapshot

Sin fila de preferencia → **no elegible** (equivalente a false). Usuarios existentes **no** migran a opt-in.

`emailNotificationsEnabled === false` **no** bloquea campañas (es otro interruptor). Campañas **tampoco** respetan ese flag al revés: opt-out marketing no apaga claim QR ni verificación.

---

## 4. Consentimiento V1 — modelo

**No** meter timestamps de marketing en `User.preferences` (JSON sin trazabilidad suficiente).

Modelo nuevo `UserMarketingPreference` 1:1 con `User`:

```
tenantId
userId                 @unique
emailOptIn             Boolean  @default(false)
emailOptInAt           DateTime?
emailOptOutAt          DateTime?
emailUnsubscribeToken  String?  @unique   // random 32 bytes hex; se emite al optar-in
whatsappOptIn          Boolean  @default(false)
whatsappOptInAt        DateTime?
whatsappOptOutAt       DateTime?
source                 String    // ACCOUNT | UNSUBSCRIBE | ADMIN
updatedAt
```

`onDelete: Cascade` al User (preferencia, no histórico de campaña).

**Canales independientes.** `EMAIL=true` + `WHATSAPP=false` es el caso V1 típico.

**Source:** `ACCOUNT` (toggle `/me/account`), `UNSUBSCRIBE` (página pública), `ADMIN` reservado (no bypass de opt-in para send).

**Unsubscribe token:** `crypto.randomBytes(32).toString('hex')`. **No** `?userId=` ni `?email=`. Ruta pública (sin login):

```
/baja-promos?token=...     (web)
GET/POST /public/marketing/unsubscribe?token=...
```

Efecto: `emailOptIn=false`, `emailOptOutAt=now()`, `source=UNSUBSCRIBE`. Rota o invalida el token. **No** toca transaccional.

Re-subscribe: `/me/account` → Comunicaciones → email opt-in otra vez (nuevo token, `emailOptInAt=now()`, `emailOptOutAt=null`). Sin double-opt-in V1 (legales actuales no lo exigen).

WhatsApp PATCH: API **rechaza** `whatsappOptIn: true` mientras el provider no esté configurado (`WHATSAPP_PROVIDER_NOT_CONFIGURED`). No persistir opt-in ficticio.

---

## 5. Dominio campaña

Modelos mínimos:

```
AdminCampaign
AdminCampaignDelivery
```

Sin tabla AudienceSnapshot separada: cada delivery **es** el snapshot de recipient (userId nullable + skip reason).

### `AdminCampaign`

| Campo | Rol |
|-------|-----|
| `tenantId` | isolation |
| `createdByUserId` | Admin actor (`SetNull`) |
| `status` | ver lifecycle |
| `channel` | `EMAIL` \| `WHATSAPP` |
| `contentType` | ver §6 |
| `contentId` | id canónico |
| `contentSnapshot` | JSON presentación al send (title, image, url, benefit) |
| `audienceKind` | ver §7 |
| `audienceFilter` | JSON pequeño (`city`, `category`) |
| `subject`, `headline`, `body`, `ctaLabel` | copy editorial Admin |
| `ctaUrl` | resuelto server-side (HTTPS); default = URL canónica del contenido |
| `queuedCount`, `sentCount`, `skippedCount`, `failedCount` | counters |
| `startedAt`, `completedAt`, `archivedAt` | |
| `cancelRequestedAt` | workers saltan pendientes |

**No** `scheduledAt` V1 (no hay primitive de calendar; send explícito Admin).

### `AdminCampaignDelivery`

| Campo | Rol |
|-------|-----|
| `tenantId`, `campaignId` | |
| `userId` | `SetNull` on User delete |
| `channel` | |
| `status` | `QUEUED` \| `SENT` \| `SKIPPED` \| `FAILED` |
| `skipReason` / `errorCode` | sanitizado (sin SMTP password) |
| `providerMessageId` | nullable (SMTP suele no darlo) |
| `targetHint` | email enmascarado opcional (`j***@dominio`) — no cuerpo |
| `queuedAt`, `processedAt` | |

**Unique:** `(campaignId, userId, channel)` — idempotencia send/retry.

**No** statuses `DELIVERED`/`READ`/`OPENED` (SMTP no los reporta; **no** tracking pixel).

Deep delete: deliveries históricas se conservan con `userId` null. No Restrict que bloquee borrado. No borrar history de campañas enviadas.

### Lifecycle

```
DRAFT → SENDING → COMPLETED | PARTIAL | FAILED
DRAFT → CANCELLED
SENDING + cancelRequested → workers SKIPPED restantes → CANCELLED o PARTIAL
```

`PARTIAL` = terminó con mix sent+skipped/failed.  
`FAILED` = ningún SENT (provider down / audiencia 0 post-revalidación / WhatsApp not configured).

Transición `DRAFT → SENDING` **atómica** (`updateMany` where status=DRAFT). Doble click / dos admins → segundo recibe conflicto.

Delete: solo `DRAFT` o `CANCELLED` sin deliveries. Enviada → `archivedAt`, no hard-delete.

---

## 6. Content types V1

`Activity` técnico = `Event.category = excursion`. **No** dos tipos para el mismo row.

| `contentType` | Modelo | Elegibilidad send | URL canónica |
|---------------|--------|-------------------|--------------|
| `GASTRO_DISCOUNT` | `GastroDiscount` | `ACTIVE`/`APPROVED`, `archivedAt` null, no expired, profile ACTIVE, `visibility=PUBLIC` | `/descuentos/{id}` |
| `ACTIVITY_COUPON` | `ActivityCoupon` | `ACTIVE`/`APPROVED`, `archivedAt` null, no expired, event `excursion` | `/excursiones/cupones/{id}` |
| `EVENT` | `Event` | `category` ≠ `excursion`; `APPROVED`, `deletedAt` null, `isEventPubliclyVisible` | `/events/{id}` (incluye `isGeneralPublication`) |
| `EXCURSION` | `Event` | `category = excursion`; `APPROVED`, `deletedAt` null | `/excursiones/{id}` |

**Fuera de V1:** rental, hotel (Próximamente), `GastroContent` suelto (vive en ficha local, sin URL de “publicación” estable distinta del EVENT gastro).

Al **Send**: revalidar elegibilidad; si el contenido ya no es publicable → rechazo de campaña (no enviar audiencia). Snapshot de presentación en ese momento (title, image, url, `formatCouponVisualBenefit` si aplica). Copy editorial Admin **no** overridea el beneficio canónico de la card.

CTA: default ruta interna `WEB_APP_URL` + path. URL manual: HTTPS only, no `javascript:` / `data:`.

Imagen: la del recurso. Custom GCS **diferido**.

---

## 7. Segmentación V1

Sin segment builder SQL. Sin filtros sensibles (salud, religión, política, orientación).

| `audienceKind` | Quién |
|----------------|-------|
| `ALL_ELIGIBLE` | users del tenant que pasan §3 (opt-in email, etc.) |
| `CITY` | `ALL_ELIGIBLE` ∩ `preferences.preferredCities` contiene `audienceFilter.city` |
| `FAVORITE_CATEGORY` | `ALL_ELIGIBLE` ∩ (`favoriteCategories` o `UserFavorite.category`) = filtro |
| `CONTENT_CLAIMANTS` | `ALL_ELIGIBLE` ∩ claim del `contentId` con `userId` no null |

**No V1:** lista explícita de userIds (PII en UI), “todos los que compraron”, SQL libre.

Preview: `eligibleCount` (+ `excludedEstimate` si es barato: p. ej. users con email verificado vs opt-in). **Send re-resuelve** audiencia (no usa el count cacheado).

Un envío por `userId` por campaña/canal. `User.email` ya es unique por tenant.

Roles: solo `Role.ADMIN` crea/envía. GASTRO/PRODUCER/operador **no**.

---

## 8. Delivery worker (EMAIL)

```
Admin Send
  → status DRAFT→SENDING (atomic)
  → resolve audience (ids)
  → create deliveries QUEUED (skipOnDuplicates)
  → enqueue job por delivery en 'campaign-emails'
  → worker:
       revalidate user/email/verified/opt-in/content still eligible
       opted out / deleted / null email → SKIPPED
       EmailService.send(template ADMIN_CAMPAIGN + unsubscribe URL)
       SENT | FAILED (retry si error recuperable)
  → al drenar cola: COMPLETED / PARTIAL / FAILED
```

Cancel en SENDING: `cancelRequestedAt`; worker no envía QUEUED restantes (`SKIPPED` + `CANCELLED_BY_ADMIN`). Ya SENT no se retracta.

Errores persistidos: código corto (`SMTP_REJECTED`, `USER_GONE`, `OPT_OUT`, `NO_EMAIL`, …). **Sin** password/token/provider dump.

Métricas Admin reales: queued / sent / skipped / failed. **No** delivered/opened/clicked.

Test send (opcional V1): un mail al Admin actor vía misma template, **sin** crear audiencia masiva. Si el slice se infla, diferir; `smoke:email-template` cubre HTML.

---

## 9. Admin UI

Ruta: `/admin/campanas` (castellano, consistente con `/admin/excursiones`).

Nav: `portalNavConfig` admin → **Campañas**.

Flujo: listado → draft → picker contenido → canal → segmento → copy → preview (estimate) → confirmación “Enviar a N” → resultados + deliveries paginadas.

WhatsApp: canal visible, Send **disabled**, copy “Proveedor no configurado”.

Arquitectura: UI → TanStack Query → repo interface → `ApiRepository` → Nest. **Sin fetch directo.**

---

## 10. Digest vencidos (operativo, slice 8.6)

**No** usa `UserMarketingPreference`. Destinatarios: `Role.ADMIN` + `status=ACTIVE` + `email != null` del tenant (no hardcode).

Cron diario prod `20 8 * * *` (08:20 AR-ish vía server TZ / UTC documentado en closing); dev `*/30`. Flag `ADMIN_EXPIRED_BENEFITS_DIGEST_CRON_ENABLED` skip si `"false"`.

Ventana: status `EXPIRED` en últimas 24h, GastroDiscount **y** ActivityCoupon, no archivados. Un correo consolidado por admin/día. Idempotencia: `NotificationDeliveryLog` **sí** se puede usar aquí (`kind` nuevo operativo `ADMIN_EXPIRED_BENEFITS_DIGEST` + `referenceKey = digest:{yyyy-mm-dd}`) **o** tabla mínima propia si no queremos ensuciar kinds de usuario. **Preferencia:** kind interno + `deliver()`/`enqueueTemplate` hacia admins, **sin** pasar por campaign opt-in.

Si el slice 8.6 se ve grande tras 8.3–8.4: implementar digest; es el alcance pedido (deuda Etapa 5 “pequeña”).

---

## 11. Provider abstraction WhatsApp (slice 8.5)

Mínimo:

```
CampaignChannelProvider.isWhatsAppConfigured(): false
sendWhatsApp() → never; throw/return PROVIDER_NOT_CONFIGURED
```

Env futuro (no inventar valores): `WHATSAPP_PROVIDER`, credentials. **No** SDK ahora.

Commit de código si hay enum/channel guard + status API; si solo prosa → `docs(v3.3): document whatsapp provider dependency`.

---

## 12. Tests / builds / smokes

| Área | Expectativa cierre |
|------|-------------------|
| Unit marketing prefs / unsubscribe / campaign domain / delivery rules | scripts `test:marketing-*`, `test:admin-campaign-*` |
| Regression | `test:gastro-discount-qr` claim path conceptual; templates gastro/activity QR **no** leen marketing opt-in |
| `smoke:email` / live SMTP masivo | **NO** campaña real a usuarios |
| DB migrate | si Postgres caído: **NO EJECUTADO** P1001 |
| Redis worker integration | si Redis caído: **NO EJECUTADO** |
| Builds | shared, api, web, scanner, `prisma validate` |

---

## 13. Slices confirmados

| Slice | Commit |
|-------|--------|
| 8.0 Audit | `docs(v3.3): audit campaign communications architecture` |
| 8.1 Prefs + unsubscribe | `feat(v3.3): add marketing communication preferences` |
| 8.2 Domain + audience | `feat(v3.3): add admin campaign domain` |
| 8.3 Email delivery | `feat(v3.3): deliver admin email campaigns` |
| 8.4 Admin UI | `feat(v3.3): add admin campaign management ui` |
| 8.5 WhatsApp ready | `feat(v3.3): prepare campaign whatsapp channel` **o** docs si no hay código |
| 8.6 Expired digest | `feat(v3.3): add admin expired benefits digest` |
| 8.7 Hardening + closing | closing doc; **sin** context update; **sin** push |

---

## 14. Fuera de alcance

WhatsApp Web / `wa.me` blast, tracking pixels, opens/clicks, A/B, journeys, CRM, AI copy, settlement, payments, self-service Gastro/Producer, Etapa 9, scheduler calendar, custom campaign image GCS (diferible), double-opt-in, E.164 masivo.

---

## 15. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Blast en cola `'emails'` retrasa verificación | cola `'campaign-emails'` |
| Consentimiento inferido | default false; no backfill |
| SMTP sin webhooks | métricas solo queued/sent/skipped/failed |
| Redis down | send Admin falla explícito; no for-loop HTTP |
| Deep delete vs history | `userId` SetNull en deliveries |
| `emailNotificationsEnabled` confusión | copy UI: “novedades y promociones” ≠ “alertas de cuenta” |
)