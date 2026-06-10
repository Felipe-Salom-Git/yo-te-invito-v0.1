# CONTEXT_PENDIENTES.md — Checklist de seguimiento

Lista viva de **pendientes y mejoras**. Marcá con `[x]` lo completado.

**Convención:** `- [ ]` pendiente · `- [x]` hecho

## Google Cloud / Storage / SEO / Maps — bloque cerrado (2026-06-01)

> Checklist V2 § Google Cloud · § GSC/SEO · Runbooks: [`GOOGLE_CLOUD_RUNBOOK.md`](../deploy/GOOGLE_CLOUD_RUNBOOK.md) · [`GCS_STORAGE_STRATEGY.md`](../deploy/GCS_STORAGE_STRATEGY.md) · [`SEARCH_CONSOLE_SEO_RUNBOOK.md`](../deploy/SEARCH_CONSOLE_SEO_RUNBOOK.md) · Auditorías: [`MAPS_LOCATION_AUDIT.md`](../audits/MAPS_LOCATION_AUDIT.md) · [`SEO_TECHNICAL_AUDIT.md`](../audits/SEO_TECHNICAL_AUDIT.md)

- [x] Proyecto GCP `yoteinvito-1721413433327` + billing + colaborador técnico
- [x] Maps APIs + key restringida + `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en prod
- [x] GCS bucket privado `yti-prod-storage` + backups PG (timer 03:30, restore drill, lifecycle 30d)
- [x] GCS bucket público `yti-prod-public-assets` + CORS + `POST /uploads/public-image` + ownership + smokes PASS
- [x] Formularios GCS: rentals, admin eventos/excursiones, productora, gastro, hotel
- [x] SEO técnico base: `robots.txt`, `sitemap.xml`, metadata, JSON-LD, portales privados en robots
- [x] GSC: propiedad `yoteinvito.club` verificada + sitemap enviado
- [x] Maps prod: autocomplete, fallback manual, persistencia placeId/province, Ver ubicación, migración Prisma, JSON-LD local

**Pendientes no bloqueantes (ops):**

- [ ] Budget alerts GCP (50% / 80% / 100%)
- [ ] `storage:audit-data-urls` read-only en prod
- [ ] Migración data-URL legacy por lotes (post-backup)
- [ ] `storage:audit-orphans` read-only + cleanup huérfanos tras revisión manual
- [ ] CDN `cdn.yoteinvito.club` (fase 2)
- [ ] Signed URLs ampliadas para `private/*`
- [ ] GSC: procesamiento sitemap, cobertura, CWV con tráfico, Rich Results Test
- [ ] Backfill Maps legacy; productoras sede exacta (si se decide); unificar `ARGENTINA_PROVINCES`

---

## Perfiles y registro (2026-05)

- [x] Auditar flujo actual de registro con elección de perfil — `docs/audits/REGISTER_ONBOARDING_AUDIT.md` (Slice 1, 2026-05-24)
- [x] Matriz definitiva de campos por tipo de perfil — `docs/onboarding/PROFILE_FIELDS_MATRIX.md` (Slice 2, 2026-05-24; decisión Rental: no wizard V2)
- [x] Registro/onboarding Slice 3: schemas register/apply unificados por perfil — `docs/onboarding/REGISTER_SCHEMA_ALIGNMENT.md` (2026-05-24)
- [x] Registro/onboarding Slice 4: hardening legal signup — `docs/onboarding/LEGAL_SIGNUP_HARDENING.md` (2026-05-24)
- [x] Registro/onboarding Slice 5: wizard base + comprador — `docs/onboarding/REGISTER_BUYER_WIZARD_BASE.md` (2026-05-24)
- [x] Registro/onboarding Slice 6: formulario productora — `docs/onboarding/REGISTER_PRODUCER_FORM.md` (2026-05-24)
- [x] Registro/onboarding Slice 7: formulario gastronómico — `docs/onboarding/REGISTER_GASTRO_FORM.md` (2026-05-24)
- [x] Registro/onboarding Slice 8: rental sin signup V2 — `docs/onboarding/REGISTER_RENTAL_DECISION.md` (2026-05-24)
- [x] Registro/onboarding Slice 9: formulario hotel — `docs/onboarding/REGISTER_HOTEL_FORM.md` (2026-05-24)
- [x] Registro con elección de perfil + formulario específico (`POST /auth/register` con `profileType` / `profileData`)
- [x] Perfiles comerciales activos al crear (sin cola admin de perfiles)
- [x] Admin: ocultar «Perfiles pendientes» (`/admin/perfiles` redirige a `/admin`)
- [x] Script test user: `pnpm --filter api run user:restore-master` (`felipe.e.salom@gmail.com`) — rol `ADMIN` + memberships portales; **cerrar sesión y volver a entrar** para refrescar JWT
- [x] Portal `/admin/*` protegido en web (`ProfileProtectedLayout`, rol `ADMIN`); post-login y URL directa (`/profiles` deprecado como selector — redirect por rol, V3.1 Etapa 1)
- [x] **Navbar V2** (2026-05): responsive, drawer mobile, ciudad, carro, portales, a11y, smoke — checklist V2 § Navbar cerrado
- [ ] Deprecar/eliminar endpoints legacy `RoleApplication` y `/admin/applications` (opcional)
- [ ] UI preferencias `notifyProducerEventStatus` en portal (backend ya soporta; default `true`)

---

## Legal Admin (documentos administrables) — módulo técnico cerrado

> Referencia operativa: **`docs/legal/LEGAL_ADMIN_MODULE.md`** · QA manual: **`docs/dev/LEGAL_ADMIN_QA_SMOKE.md`** · Smokes: `pnpm --filter api run smoke:legal`

- [x] **Slice 2 (2026-05-24):** modelos Prisma, migración, schemas shared, módulo `legal`, endpoints lectura, seed `seed:legal-documents`
- [x] **Slice 3 (2026-05-24):** `PATCH` metadata, `POST` draft/publish, archivado automático, validación anti-placeholder, `AuditLog` en mutaciones, smoke ampliado `test:legal-documents`
- [x] **Slice 4 (2026-05-24):** UI admin `/admin/legales` (listado, detalle, versiones), `LegalDocumentsRepo`, hooks TanStack Query, nav admin «Legales»
- [x] **Slice 5 (2026-05-24):** páginas públicas `/legal/[slug]` dinámicas (API publicada, metadata, 404 controlado)
- [x] **Slice 6 (2026-05-24):** `GET/POST /me/legal/*`, requirements, aceptación por versión, hooks/componentes reutilizables, `test:me-legal-acceptance`
- [x] **Slice 7 (2026-05-24):** footer legales, registro + `POST /me/legal/accept` post-signup, checkout (`/me/cart`, `/checkout/*`), banner portal comercial, `GET /public/legal/requirements`
- [x] **Slice 8 (2026-05-24):** QA/hardening, `smoke:legal`, `docs/legal/LEGAL_ADMIN_MODULE.md`, smoke manual `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`
- [x] **Slice Legal Content 1 (2026-05-24):** `seed:legal-content` — importa `docs/legal/*.md` como DRAFT (no auto-publish)
- [x] **Legales V2 (2026-05-24):** layout portales ampliado (`PORTAL_BODY_CLASS` `max-w-screen-2xl`, `PortalPageContext` + `PageContainer` sin doble `max-w`); listado `/admin/legales` — tabla administrativa original (`overflow-x-auto`, `min-w-[900px]`, `md:block`) + cards mobile (`md:hidden`)
- [x] **Slice Legal Content 2 (2026-05-24):** aclaraciones productor ↔ referido en `docs/legal/` (`terms_general`, `producer_terms`, `referrer_terms`) + disclaimers UI referidos/productor; actualizar borradores con `seed:legal-content --force` (sin auto-publish)
- [ ] Revisión/aprobación cliente y **publicación** de versiones legales en `/admin/legales` — en prod hay **bootstrap temporal** (Mayo 2026); reemplazar antes de cerrar go-live
- [ ] Confirmar publicación de aclaraciones legales productor ↔ referido (tras publish manual en admin)
- [x] **V3.1 Etapa 11 (2026-06-10):** auditoría publicación legales + `EVENT_PUBLICATION` + bloqueo publicar evento — `docs/audits/V3_1_STAGE_11_LEGAL_CLOSING.md`; smoke `smoke:v31-event-publication-legal`
- [ ] Publicar `producer_terms` (y resto docs) tras aprobación cliente — BD local: solo DRAFT v1
- [ ] Bloqueos duros otras verticales (descuentos gastro, pago referido, etc.) si faltan términos
- [ ] Migrar disclaimers hardcoded (transferencia, referidos) a documentos publicados

### Registro / legales (checklist V2 — integración)

- [x] Aceptación obligatoria términos generales en registro (`SIGNUP`, docs publicados)
- [x] Links legales en registro, checkout, footer, portales
- [x] Matriz campos signup vs onboarding por perfil — `docs/onboarding/PROFILE_FIELDS_MATRIX.md`
- [x] Schemas register/apply alineados (Slice 3) — `docs/onboarding/REGISTER_SCHEMA_ALIGNMENT.md`
- [x] Hardening legal signup (Slice 4) — `docs/onboarding/LEGAL_SIGNUP_HARDENING.md` (requirements `canProceed`, register transaccional, retry UI)
- [x] Pulir formulario registro comprador / wizard base (Slice 5) — `docs/onboarding/REGISTER_BUYER_WIZARD_BASE.md`
- [x] Pulir formulario registro productora (Slice 6) — `docs/onboarding/REGISTER_PRODUCER_FORM.md`
- [x] Pulir formulario registro gastronómico (Slice 7) — `docs/onboarding/REGISTER_GASTRO_FORM.md`
- [x] Rental / proveedor equipos: sin wizard V2, admin + CTA público (Slice 8) — `docs/onboarding/REGISTER_RENTAL_DECISION.md`
- [x] Pulir formulario registro hotel (Slice 9) — `docs/onboarding/REGISTER_HOTEL_FORM.md`
- [x] Pulir formulario registro referido (Slice 10) — `docs/onboarding/REGISTER_REFERRER_FORM.md`
- [x] Textos de responsabilidad UX por tipo de usuario centralizados (Slice 11) — `docs/onboarding/PROFILE_RESPONSIBILITY_COPY.md`
- [x] Estado visual completitud/onboarding post-registro (Slice 12) — `docs/onboarding/PROFILE_COMPLETION_ONBOARDING.md`
- [x] Mensajes de error y validaciones visibles en registro (Slice 13) — `docs/onboarding/REGISTER_ERROR_VALIDATION_UX.md`
- [x] UX mobile + accesibilidad registro completo (Slice 14) — `docs/onboarding/REGISTER_ONBOARDING_SMOKE.md`
- [x] Fixes registro email duplicado + hotel provincia/ciudad (Slice 12.5) — `docs/onboarding/REGISTER_FORM_FIXES_EMAIL_HOTEL_LOCATION.md`
- [x] Registro gastro: select provincia/ciudad dependiente (Slice 12.6) — `docs/onboarding/REGISTER_GASTRO_LOCATION_SELECT.md`
- [x] **Bloque registro/onboarding por tipo de usuario (V2) cerrado** — slices 1–14 + 12.5–12.6; smoke: `docs/onboarding/REGISTER_ONBOARDING_SMOKE.md`
- [ ] Redacción/publicación legal profesional por vertical (contenido en `docs/legal/`, no solo copy UX)

---

## Emails transaccionales (DonWeb SMTP)

> **Bloque cerrado PROD OK (2026-06):** [`EMAILS_CLOSING_AUDIT.md`](../emails/EMAILS_CLOSING_AUDIT.md) · arquitectura [`EMAILS_ARCHITECTURE.md`](../emails/EMAILS_ARCHITECTURE.md) · matriz [`EMAIL_MATRIX.md`](../emails/EMAIL_MATRIX.md)

- [x] Auditar sistema actual (Resend, cola, `NotificationDeliveryLog`, callers, env, frontend prefs)
- [x] Propuesta arquitectura `MailProvider` + SMTP DonWeb `@yoteinvito.club` (Slice 1)
- [x] Slice 2: `MailProvider`, `ResendMailProvider`, `SmtpMailProvider`, `MAIL_PROVIDER`, `smoke:email`
- [x] Validación SMTP DonWeb **local** — `smoke:email` OK (`messageId`; host `c2821613.ferozo.com:465`, `no_reply@yoteinvito.club`)
- [x] **Producción VPS:** `MAIL_PROVIDER=smtp`, API `/health` OK, smokes por familia OK, pruebas manuales OK; password SMTP rotada en servidor (no en repo)
- [x] Slice 3: layout base + registry + renderer + 3 templates piloto + `sendTemplate` + `smoke:email-template`
- [x] Slice 3b: callers piloto — `AUTH_WELCOME_BUYER` (registro USER), `PRODUCER_EVENT_APPROVED` (aprobación admin), `OperationalAlertsEmailService` (`ADMIN_CRITICAL_ALERT`)
- [x] Slice 4 (tanda 1): `AUTH_WELCOME_PRODUCER|GASTRO|HOTEL|REFERRER`, `AUTH_VERIFY_EMAIL`, `PRODUCER_EVENT_REJECTED` + callers en `AuthService` / `ProducerEventStatusNotificationsService`
- [x] Slice 5: `TICKET_TRANSFER_*` (4) + `EVENT_REMINDER_24H`; callers transfer + cron; migración `NotificationKind` transfer status
- [x] Slice 6: `REVIEW_*` (7 templates) + `ReviewNotificationsService` con `emailTemplateId` (sin migración Prisma nueva)
- [x] Slice 7 (emails): `REFERRAL_*` (7 templates) + `ReferralEmailsService` + callers proposals/payments/association/commission; sin migración Prisma; sin automatizar pagos
- [x] Slice 8 (emails): `FAVORITE_EVENT_SOON`, `EXPECTED_EVENT_SOON`, `FOLLOWED_GASTRO_NEW_DISCOUNT` con template en callers; `FOLLOWED_PRODUCER_NEW_EVENT` / `FAVORITE_INTEREST_NEW_CONTENT` template listo (email sigue off)
- [x] Slice 9 (emails): `ADMIN_*` operaciones (5 templates + `ADMIN_CRITICAL_ALERT`); callers: evento `PENDING`, fallo GCS, fallo cola email; scanner/pago/factura pendientes
- [x] Slice 10 (emails): cierre técnico — [`EMAILS_CLOSING_AUDIT.md`](../emails/EMAILS_CLOSING_AUDIT.md); eliminado legacy muerto (`renderWelcomeEmail`, `renderVerificationEmail`); legacy checkout/payouts conservado
- [ ] Slice 4b: `AUTH_PASSWORD_RESET` cuando exista flujo API de reset con email
- [ ] `REVIEW_PENDING_REMINDER` template + email en cron reviews (hoy solo in-app; `sendEmail: false` a propósito)
- [ ] Conectar `OperationalAlertsEmailService` a flujos críticos reales (email/pago/storage) cuando existan
- [ ] **Bloque pagos/checkout/facturación:** importar templates checkout/pagos/factura; migrar `renderOrderConfirmationEmail`, payouts, webhooks; ver `EMAILS_CLOSING_AUDIT.md` §7
- [ ] `EmailOutboundLog` + idempotencia checkout/auth + reintentos BullMQ explícitos
- [ ] Matriz completa checklist V2 §4 (bienvenidas por perfil, referidos, admin alertas, factura)
- [ ] UI preferencias email granulares (`notifyProducerEventStatus`, reviews, etc.)

---

## A. Infraestructura y backend

- [x] Ejecutar migraciones Prisma en producción VPS (`npx prisma migrate deploy` + `prisma generate`) — Mayo 2026; incluye hotfix `20260531072000_restore_user_push_subscription`
- [ ] Ejecutar migraciones Prisma en cada entorno futuro tras cambios de schema (mismo flujo: `migrate deploy`, no `pnpm db:migrate`)
- [ ] Confirmar cliente Prisma alineado con DB (hotel, inbox, **RentalLocation**, opening hours JSON, etc.)
- [ ] Rate limiting y hardening en producción (Nginx + Nest — pendiente post-deploy)
- [x] Variables Web Push documentadas (`USER_PORTAL.md`, `AI_ENTRYPOINT.md`, `BACKEND_CONTEXT.md`)
- [ ] Variables de entorno documentadas por app en plantilla centralizada (prod configuradas en servidor; valores no versionados)

### Producción técnica — VPS DonWeb (Infra 2B + hardening seguridad, Mayo 2026)

> **Auditorías:** [`PREPRODUCTION_DEPLOY_AUDIT.md`](../audits/PREPRODUCTION_DEPLOY_AUDIT.md) · [`PRODUCTION_SECURITY_HARDENING_AUDIT.md`](../audits/PRODUCTION_SECURITY_HARDENING_AUDIT.md)  
> **Runbook:** [`docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`](../deploy/DONWEB_PRODUCTION_RUNBOOK.md) — §24 ejecución real, §25 seguridad post-deploy  
> **Checklist V2:** `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` § Producción técnica

**Estado actual:** VPS DonWeb productivo con systemd + Nginx + HTTPS. Web/API/Scanner en **`yoteinvito.club`**. **Storage V2 cerrado funcional (2026-05-31).** **SEO baseline:** auditoría SEO 1 — [`SEO_TECHNICAL_AUDIT.md`](../audits/SEO_TECHNICAL_AUDIT.md). **SEO 3–8 aplicado:** OG/Twitter global + icons/manifest, metadata estática rutas base, `robots.ts`, **sitemap final (SEO 9)**, metadata dinámica fichas públicas principales, canonical/dedupe, JSON‑LD. Pendiente: **GSC manual** (propiedad + TXT + envío sitemap), `noindex` portales (SEO 2).

| Ítem | Estado |
|------|--------|
| Contratar VPS | [x] DonWeb — Ubuntu 24.04, IP `179.43.124.145` |
| Configurar dominio | [x] `yoteinvito.club` + `www` / `api` / `scanner` (DNS DonWeb; correo MX/SPF/DKIM/DMARC preservados) |
| PostgreSQL producción | [x] Local VPS — DB `yo_te_invito`, usuario `yti_app`, tenant `tenant-demo` |
| Redis producción | [x] Local VPS |
| Variables de entorno | [x] API / web / scanner — permisos `600`, owner `deploy:deploy`; secretos rotados (Mayo 2026) |
| Migraciones Prisma | [x] `npx prisma migrate deploy` (no `pnpm db:migrate`); hotfix `20260531072000_restore_user_push_subscription` |
| Usuario admin real | [x] `felipe.e.salom@gmail.com` + `user:restore-master` |
| Seed subcategorías | [x] `seed:subcategories` + `seed:legal-documents` |
| SSH hardening | [x] `ssh yoteinvito` → `deploy@…:5230`, clave, sin root/password |
| UFW base | [x] Solo `5230`, `80`, `443`; regla `200.58.112.191` eliminada |
| Backups automáticos | [x] GCS cerrado 2026-05-31 — timer 03:30, restore drill, lifecycle 30d — [`GCS_BACKUPS_RUNBOOK.md`](../deploy/GCS_BACKUPS_RUNBOOK.md) |
| Storage V2 GCS (upload + formularios + smokes) | [x] Cerrado funcional prod 2026-05-31 — §24.9 DONWEB |
| Logs / monitoreo | [ ] |
| Rate limiting / hardening fino | [ ] Nginx/Nest; bind apps a `127.0.0.1`; revisar postfix `:25`, snmpd `:161` |

#### Pendientes críticos post-deploy (producción)

**Cerrado (hardening Mayo 2026):**

- [x] **Rotar secretos:** password root VPS, password DB `yti_app`, `JWT_SECRET`, `NEXTAUTH_SECRET` (sesiones viejas pueden requerir re-login)
- [x] SSH por clave; root SSH y login por password deshabilitados (`ssh yoteinvito`, puerto `5230`, usuario `deploy`)
- [x] `DEV_AUTH_ENABLED=false`, `NODE_ENV=production` en API; permisos `600` en `.env`
- [x] UFW: solo `5230` / `80` / `443`

**Hotfix migración (Mayo 2026):** tabla `UserPushSubscription` faltaba en prod pese a modelo en `schema.prisma` — migración `20260531072000_restore_user_push_subscription` (idempotente). Ver auditoría de hardening.

**Pendiente:**

- [x] **Backups automáticos** — PostgreSQL → GCS; VPS 2026-05-31; lifecycle `backups/postgres/` 30 días.
- [x] **Admin Rentals upload GCS** — cover + galería productos.
- [x] **Admin Eventos + Excursiones upload GCS** — publicaciones-generales (event/excursion) + operador excursiones.
- [x] **Storage V2 producción** — deploy slices 6–11, upload UI, `smoke:storage-upload` + `smoke:storage-upload-auth` PASS (2026-05-31).
- [ ] **Storage V2 ops legacy (no bloqueante):** auditoría data-URL read-only; migración por lotes post-backup; auditoría/cleanup huérfanos manual; CDN; signed URLs `private/*`; smokes cross-owner con fixtures.
- [ ] Rate limiting Nginx; rate limiting Nest (slice código)
- [ ] Monitoreo / alertas (disco, servicios, certificado TLS)
- [ ] `certbot renew --dry-run` documentado
- [ ] Health check extendido (DB/Redis), no solo `GET /health`
- [ ] Bind `yti-api` / `yti-web` / `yti-scanner` a `127.0.0.1` (hoy escuchan en `*`, UFW bloquea externo)
- [ ] Revisión `postfix` (puerto 25) y `snmpd` (puerto 161)
- [ ] **Legales:** reemplazar bootstrap temporal por contenido aprobado en `/admin/legales`
- [ ] Smoke completo desde dominio real (home, login, admin, checkout demo, scanner QR, emails si Resend)
- [ ] Getnet **go-live cerrado** — redirect VPS OK; pendiente webhook Portal Getnet + pago mínimo + tickets automáticos + merge `main` — [GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md](../payments/GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md), [GETNET_ACTIVATION_CHECKLIST.md](../payments/GETNET_ACTIVATION_CHECKLIST.md).
- [x] Deploy VPS `feat/v1-s03-api-foundation` — servicios `yti-*` active; smokes config/auth/dry-run OK.
- [x] Alias URLs fijas portal Getnet (`/checkout/success`, `/checkout/error`, `/api/getnet/callback`) — [GETNET_PORTAL_URL_COMPATIBILITY.md](../payments/GETNET_PORTAL_URL_COMPATIBILITY.md).
- [x] Web Checkout contrato producción (OAuth body, `GETNET_GLOBAL_*` fallback, payload `customer` + `physical_goods`, `merchant_id` opcional) — [GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md](../payments/GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md).
- [x] Smoke productivo payment-intent local (`GETNET_WEBCHECKOUT_CONFIRM_PROD=yes`, amount 50000) — [GETNET_PRODUCTION_SMOKE.md](../payments/GETNET_PRODUCTION_SMOKE.md).
- [x] Redirect productivo app → Getnet hosted checkout (VPS, sin pago real) — [GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md](../payments/GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md).
- [ ] Webhook Basic Auth registrado en Portal Getnet (mismo user/password que API).
- [ ] Pago mínimo autorizado + webhook recibido + emisión tickets automática.

## Getnet Web Checkout Redirect — VPS smoke OK

- Rama desplegada: `feat/v1-s03-api-foundation`.
- `main` sigue sin cambios.
- Redirección productiva a Getnet hosted checkout validada desde la app.
- Webhook Basic Auth pendiente de registrar/configurar en Portal Getnet.
- No se realizó pago real.
- No considerar el bloque cerrado hasta validar webhook + emisión automática de tickets.
- [ ] **SEO técnico (SEO 2–9):** robots/sitemap, no-index portales, metadata dinámica, JSON-LD, GSC — baseline [`SEO_TECHNICAL_AUDIT.md`](../audits/SEO_TECHNICAL_AUDIT.md)

### Google Cloud — Etapa A manual (cerrada) / Etapa B (Storage cerrado; Maps/SEO pendiente)

> **Runbook:** [`docs/deploy/GOOGLE_CLOUD_RUNBOOK.md`](../deploy/GOOGLE_CLOUD_RUNBOOK.md)  
> **Checklist V2:** `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` § Google Cloud · GSC · SEO

**Etapa A — hecho en consola GCP (sin integración en app aún):**

| Ítem | Estado |
|------|--------|
| Proyecto GCP `yoteinvito-1721413433327` | [x] Billing activo; colaborador `felipe.e.salom@gmail.com` |
| Budget alerts GCP (50/80/100%) | [ ] Manual Billing — runbook §3.5 |
| GCS bucket prod `yti-prod-storage` | [x] Privado, `southamerica-east1`, uniform access, soft delete 7d |
| Service Account `yti-backend-storage` | [x] Rol Storage Object Admin sobre bucket |
| Bucket staging | Omitido por decisión — prod directa |
| Maps API Key `YTI Web Maps PROD` | [x] Referrers `yoteinvito.club` / `www`; APIs: Maps JS, Places New, Geocoding |
| Variables Maps documentadas | [x] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (valor solo en VPS/secretos) |
| Search Console dominio | [ ] Propiedad + verificación DNS TXT pendiente confirmar |

**Etapa B — pendientes principales:**

#### Backups PostgreSQL → GCS — cerrado 2026-05-31

- [x] Bucket GCS productivo creado (`yti-prod-storage`)
- [x] Service Account creada (`yti-backend-storage`)
- [x] Script repo + runbook ([`GCS_BACKUPS_RUNBOOK.md`](../deploy/GCS_BACKUPS_RUNBOOK.md))
- [x] Instalar credencial GCP en VPS
- [x] Configurar `.pgpass` + `backup-gcs.env` en VPS
- [x] Configurar timer systemd (`yti-postgres-backup.timer`, 03:30)
- [x] Ejecutar primer backup manual
- [x] Ejecutar restore drill (2026-05-31)
- [x] Definir lifecycle/retención automática en bucket (`backups/postgres/` → 30 días)

#### Storage uploads — **cerrado funcional producción (2026-05-31)**

- [x] Estrategia buckets público/privado — [`GCS_STORAGE_STRATEGY.md`](../deploy/GCS_STORAGE_STRATEGY.md)
- [x] Bucket `yti-prod-public-assets` + CORS en GCP + env `GCS_*` en VPS
- [x] API upload + ownership + formularios Admin/productora/gastro/hotel
- [x] Tooling ops (audit/migrate data-URL, orphan audit/cleanup, smokes)
- [x] Deploy VPS + upload UI + `smoke:storage-upload` + `smoke:storage-upload-auth` PASS

**Ops legacy (no bloqueante):**

- [ ] Auditoría read-only data-URL (`storage:audit-data-urls`)
- [ ] Migración data-URL por lotes (`storage:migrate-data-urls --confirm`, post-backup)
- [ ] Auditoría huérfanos + cleanup manual post-revisión
- [ ] CDN `cdn.yoteinvito.club`; signed URLs `private/*`
- [ ] `smoke:storage-global` / cross-owner con fixtures reales

#### Otros Etapa B

- [ ] Budget alerts en GCP
- [ ] Maps: key en `.env.production` web, autocomplete, lat/lng, fichas públicas, smoke
- [x] SEO técnico — auditoría baseline (SEO 1) [`SEO_TECHNICAL_AUDIT.md`](../audits/SEO_TECHNICAL_AUDIT.md)
- [ ] SEO implementación slices 2–9 (robots, sitemap, metadata, JSON-LD, GSC)

---

## B. Pagos y producción

- [ ] Integrar proveedor de pago real (hoy: demo confirm)
- [ ] Webhooks / reconciliación de pagos
- [ ] Política de reembolsos y revocación en flujo real

---

## C. Vertical hotel

**Gastro y Hoteles V2 (2026-05-22):** bloque checklist cerrado — discovery Próximamente, portal editable, ficha pública, E2E mínimo. Pendientes abajo son post-V2.

- [ ] Usuario hotel de prueba en Prisma (registro manual; sin `demo:seed`)
- [x] Edición de ficha desde portal `/hotel` (Slice 10: `GET/PATCH /hotel/me`, `/hotel/editar`; discovery sigue Próximamente)
- [x] Portal `/hotel/valoraciones` — listado + réplica (`POST /hotel/reviews/:id/reply`)
- [x] Hoteles V2 «Próximamente» — rutas públicas y portal sin CTAs de reserva (Slice 8–11: `/hoteles`, `/hoteles/[id]` informativa, portal editable, API pública hotel)
- [x] E2E mínimo hotel (`e2e/hotel.spec.ts`, `E2E_HOTEL_*`, `docs/hotel/HOTEL_E2E.md`) — portal, ficha pública, gateway, admin tab
- [ ] E2E: apply → admin aprueba → home carrusel `hotel` (fuera de V2; discovery sin carrusel hotel)

---

## D. Gastro

**Admin Gastro Locations (2026-06-02):** bloque cerrado (slices 2–5) — `docs/audits/ADMIN_GASTRO_LOCATIONS_AUDIT.md`. CRUD admin + QA smoke documentado.

- [x] Admin Gastro Slice 2 — backend CRUD locales (`GastroProfile`, `GastroPublicEventSyncService`, schemas shared)
- [x] Admin Gastro Slice 3 — listado `/admin/gastronomicos` (tabla + cards mobile, filtros URL, status patch)
- [x] Admin Gastro Slice 4 — formularios `/admin/gastronomicos/nuevo` y `…/editar` (`GastroLocalForm` mode admin, mutations POST/PATCH)
- [x] Admin Gastro Slice 5 — QA smoke + ajuste fino (ruta canónica `/gastronomicos/[profileId]`, CTA solo ACTIVE+publicado, guía manual en auditoría)

**Gastro y Hoteles V2 (2026-05-22):** bloque V2 operativo cerrado (QR, scanner, contenido, ficha, dashboard, reviews/follows). **Storage imágenes GCS — cerrado prod 2026-05-31.** Pendientes: `smoke:gastro-discounts` npm, E2E gastro dedicado.

- [x] Payload QR descuentos v1 (`yti:gastro-discount:v1:discountId:token`) — emisión en claim/aprobación; ver `docs/gastro/GASTRO_DISCOUNT_QR.md`
- [x] Scanner PWA: `POST /scanner/gastro-discounts/validate`, payload v1, `GastroDiscountValidation.claimId` (Slice 5)
- [x] Persistencia real de contenido gastro (`GastroContent` Prisma + `/gastro/events/:eventId/content`; público en ficha `GET /public/gastro-locations*`)
- [x] Ficha pública gastro pulida (`/restaurants/[id]`, `GastroPublicDetailContent`; sin ticketera; redirect `/events/:id` gastro → restaurants)
- [x] Dashboard gastro V2 (`GET /gastro/dashboard`, KPIs reales, alertas, `/gastro/validaciones` con filtros y paginación)
- [x] Gastro + Reviews V2 + follows + alerta `FOLLOWED_GASTRO_NEW_DISCOUNT` (Slice 7 — `docs/gastro/GASTRO_FOLLOWS_NOTIFICATIONS.md`)
- [ ] Storage V2 ops legacy (data-URL audit/migrate, huérfanos, CDN) — no bloqueante; upload GCS [x] prod 2026-05-31
- [x] Portal `/gastro/valoraciones` — listado + réplica (`POST /gastro/reviews/:id/reply`)

---

## E. Rentals (Equipos y Rentals)

- [x] Admin: locales + productos por local, horarios estructurados, imágenes header/galería
- [x] Detalle público: hero con cover, galería miniaturas + modal, tarjetas local/WhatsApp (sin layout evento)
- [x] WhatsApp: número real por local (`whatsappPhone` en `RentalLocation`, CTA público sin fallback demo)
- [x] Cards públicas discovery: badge «Alquiler», local/subcategoría, sin fecha/entradas (`contentCardPresentation.ts`)
- [x] Subcategorías rental en explore/home/categoría (`seed:subcategories`, filtros explore, `SubcategoryRail`, cards con `subcategoryName`)
- [x] Auditoría anti-alojamiento rentals (`lib/rentals/publicCopy.ts`, gateway Unsplash kayaks, sin 🏠 en hero)
- [x] Detalle público mobile (`RentalProductDetailContent`, `RentalMobileStickyCta`, CTA «Consultar disponibilidad», horario solo en `RentalLocalCard`, galería sin duplicar cover)

---

## F. Admin y operaciones

- [x] Cola de eventos pendientes visible en dashboard (`GET /admin/dashboard`, `AdminPendingEventsQueue` en `/admin`)
- [x] Mejorar filtros de eventos admin (`/admin/eventos`, `GET /admin/events` extendido, filtros URL + tabs)
- [x] Mejorar filtros de usuarios admin (`/admin/usuarios`, `GET /admin/users` extendido, filtros URL + paginación, perfiles en listado)
- [x] Confirmar gestión completa de subcategorías (`/admin/categorias`, CRUD 4 verticales activas, hotel Próximamente, `seed:subcategories` intacto)
- [x] Maps Etapa B — prod OK (migración, build, autocomplete, Ver ubicación, JSON-LD) — audit §23–25
- [x] Auditoría con filtros útiles en UI (`/admin/auditoria`, `GET /admin/audit-logs` extendido)

**Bloque Admin Operativo (Slices 1–5, 2026-05):** cerrado — dashboard + cola pendientes, eventos/usuarios/auditoría con filtros API, subcategorías admin, hoteles «Próximamente» en dashboard y categorías. Fuera de bloque: pagos reales, portal productor completo. **Storage GCS admin — cerrado prod 2026-05-31.**

---

## G. Frontend — UX y calidad

- [x] Compresión JPEG al subir galería/header (`RentalProductImagesForm` + `lib/image-compress.ts`) — verticales no-rental; **Admin Rentals** usa GCS desde Storage 4
- [x] Empty / loading / error consistentes en portal `/me/*` (QueryError, EmptyState, skeletons)
- [ ] Empty / loading / error consistentes (resto del sitio)
- [x] `next/image` + dominios remotos GCS (Storage 5)
- [ ] SEO metadata por ficha pública
- [ ] Sidebar móvil para portales
- [ ] Accesibilidad en modales
- [ ] Tema claro (opcional)

---

## H0. Footer público completo (2026-05-24) — bloque cerrado

> Auditoría: `docs/audits/PUBLIC_FOOTER_AUDIT.md` · Smoke: `PUBLIC_FOOTER_SMOKE.md` · Cierre: `PUBLIC_FOOTER_CLOSING_AUDIT.md` · Checklist V2 § Footer público completo

- [x] Slices 1–5: auditoría, visibilidad, API contacto pública, UI dark premium, responsive/a11y
- [x] `GET /public/platform-config` + `usePublicPlatformConfig` (footer sin `/admin/config`)
- [ ] Datos reales: Instagram, contacto institucional, web/red equipo desarrollador (post-bloque)

---

## H. Home y descubrimiento

- [x] Pantalla editorial post-splash / gateway (`/`, `/categorias`, grilla 2×2, copy Bariloche, footer home/explore — Slice 5)
- [x] Páginas `/categoria/[category]` + carruseles cruzados (`CrossCategoryRails`, Slice 6)
- [x] Home global: carruseles por `rankingScore` («más recomendados» / «mejor puntuados») vía `GET /public/events/recommended` + `useCategoryCarousels`
- [x] Landing por categoría: mismos carruseles en `/categoria/[category]`
- [x] Tabs de categoría en hero anónimo (Path A — 4 categorías sin hotel; `HOME_DISCOVERY_TABS`)
- [x] `fromPrice` / `producerName` en listados API (`GET /public/events*`, schema `EventSummary`)
- [x] Regla eventos vencidos en discovery público (`event-public-visibility.util.ts` + `PublicEventsService.publicWhere`)
- [x] `/explore` con filtros URL y metadata en cards (Slice 3)
- [x] Trending por `viewCount` (Slice 7)
- [ ] “Guardar para después” persistido
- [ ] Smoke E2E Playwright del flujo discovery (manual OK; automatizado pendiente)

---

## I. Tickets y Canvas

- [x] Render del ticket comprador desde `TicketTemplate` (`BuyerTicketVisual`, `/me/tickets/[ticketId]`)
- [x] QR comprador production-ready (mín. 200px, quiet zone, `yti:v1:` sin transformar)
- [x] Impresión ticket (`@media print`, metadatos, estado visible en print)
- [x] Compatibilidad scanner documentada + smoke `qrPayload` / `TRANSFER_PENDING` rechazado
- [ ] Validación final en staging con dispositivo físico (papel + lector en puerta)

---

## J. Referidos y documentación

- [x] Marketplace reventa eliminado — solo transferencia personal (`20260605120000_remove_resale_marketplace`)
- [x] Comisiones referidores — reglas definitivas (`docs/referrals/REFERRALS_V2.md`)
- [x] Referidos V2 Slice 2 — API propuestas comerciales (`ReferralCommercialProposal` / `Agreement`, rutas producer/referrer)
- [x] Referidos V2 Slice 3 — cálculo comisión generada por orden PAID (`ReferralCommissionService`, hook pagos)
- [x] Referidos V2 Slice 4–7 — portales, solicitud de pago manual, métricas
- [x] Referidos V2 Slice 8 — QA: `smoke:referrals`, `test:referral-proposals|commission|payment-requests`
- [ ] Deprecar flujo legacy `POST /me/commissions/request` y tab comisiones legacy en evento (opcional)
- [x] Unificar docs context (`PROJECT_CONTEXT`, `FRONTEND_CONTEXT`, `BACKEND_CONTEXT` sin sufijos V1/V2/V3)
- [ ] Mantener este archivo al cerrar slices

---

## K. Productoras / Proveedores (portal + reseñas)

**Reviews V2 — reputación y moderación (checklist producción § Reviews):** [x] UI pública, perfil comentarista, filtros, cola admin disputas, notificaciones in-app/email/push, reporte `/admin/reviews` + export CSV. Doc: `docs/reviews/REVIEWS_V2.md`.

- [x] Perfil productor por bloques: API `GET/POST/PATCH /producer/profile`, rutas `/producer/profile/*` (create, identity, images, contact)
- [x] Slice 8: hub `/producer/profile` con completitud (frontend), preview pública liviana, bloques con estado, formularios pulidos; ficha `/producers/[id|slug]` sin cambios de contrato
- [x] Ficha pública productor (`/producers/[id|slug]`) y reseñas públicas de eventos
- [x] Portal: `/producer/comments` — reseñas de eventos + solicitud de revisión (disputa) vía inbox
- [x] Admin: cola `/admin/review-disputes` para resolver disputas de reseñas
- [x] Pulir cola admin disputas: contexto en listado (reseña, autor, entidad, productor, motivo, estado review), filtros `status`/`category`/`q`, confirmaciones en acciones, hide/restore, tabla + cards mobile, auditoría
- [x] Reseñas B2B (`CommercialRelationshipReview`): API + UI portal (valoración comercial privada)
- [x] Reviews V2 base: aspectos 1–10 por categoría, estados moderación, ranking/reputación servicios, `POST /me/reviews`, `GET /public/reviews*`, perfil `/users/[userId]` (ver `docs/reviews/REVIEWS_V2.md`)
- [x] UI pública: listados con desglose aspectos vía `listPublicV2` en fichas detalle (eventos, gastro, rental, excursión, hotel)
- [x] Slice UI pública reviews: jerarquía premium (`ReviewSummary`/`ReviewCard`), empty/loading/error (`ReviewEmptyState`, `ReviewListSkeleton`, `QueryError`), paginación unificada, productora pública y `/users/[userId]` alineados
- [x] Perfil público comentarista `/users/[userId]`: header reputación, stats API (`averageOverallRating`, `categoriesCommented`, `reviewsWithOfficialReplyCount`), 404/empty, hook `useUserPublicReviews`, sin email en display público
- [x] Filtros reviews: API pública `sort`/`replyFilter`/`overallRating`; UI `PublicReviewsFiltersBar` en fichas + perfil; portales managed con URL params; gastro/hotel con respuesta y orden
- [x] Carruseles «más recomendados» / «mejor puntuados» por `rankingScore` en landing por categoría y home global
- [x] Portal productora: aspectos, réplica, filtros 1–10 en `/producer/comments`
- [x] Slice 1: dashboard productor hub (`/producer`) — KPIs, engagement, alertas evento, próximos eventos (sin bloque accesos rápidos; navegación en sidebar)
- [x] Slice 2: métricas interacción — `viewCount` Event/ProducerProfile, `GET /producer/dashboard/metrics`, `POST /public/events|producers/.../view`
- [x] Slice 3: gestión eventos productor por estado — tabs, búsqueda, cards, empty states (`/producer/events`)
- [x] Slice 4: creación/edición eventos productor — formulario por bloques, validaciones visibles, preview, post-guardado (`/producer/events/new`, `/edit`, CTAs en detalle `?welcome=1` / `?saved=1`)
- [x] Slice 5: ticket types / tandas productor — cards resumen, timeline de tandas, ayuda UX, validaciones estructuradas, Ticket Studio link (`TicketTypesEditor` en detalle evento)
- [x] Slice 6: cortesías productor — `ProducerCourtesiesPageClient`, modos CONSUMES_BATCH / FREE_CAPACITY, listado otorgamientos, sin localStorage/fetch directo (`/producer/events/[eventId]/courtesies`)
- [x] Slice 7: referidos productor — ayuda UX, copy link con feedback, tabs mobile, evento refactor (`/producer/referrals`, `/producer/events/[eventId]/referrals`); aviso comisiones pendientes (sin inventar reglas)
- [x] Slice 8: perfil productor hub — completitud calculada en frontend (`producer-profile-completeness.ts`), checklist, preview liviana, bloques con badge, formularios con intro/ayuda; estado real `profile.status` (sin `publicVisibility` inventado); **slug único auto** desde `displayName` (`producer-profile-slug.util.ts`, sufijos `-2` si colisión)
- [x] Slice 9: comentarios productor — resumen con pendientes/disputas (API), filtros (respuesta, disputa OPEN, estado público, orden), cards/modales pulidos; `ManagedReviewsCommentsPage` parametrizado (gastro/hotel sin regresión)
- [x] Slice 10: notificaciones productor por estado de evento — `EVENT_APPROVED_BY_ADMIN` / `EVENT_REJECTED_BY_ADMIN`, hook en `AdminEventsService`, `ProducerEventStatusNotificationsService`, alertas en `/producer` vía `/me/notifications`
- [x] Trending real (`viewCount` + `rankingScore` en `GET /public/events/trending`; sin `recentScore` en schema — Slice 7)
- [x] Réplica gastro/hotel/admin por rutas dedicadas (`/gastro|hotel|admin/reviews/:id/reply`)
- [x] Formularios B2B con 4 aspectos comerciales (productora ↔ referido)
- [x] Smoke tests Reviews V2 — `pnpm --filter api run smoke:reviews` + guía `docs/guides/SMOKE_TESTS_GUIDE.md`
- [x] Perfil público comentarista `/users/[userId]` + badge reputación
- [x] Auth: JWT huérfano si usuario borrado → 401 en guard + `me.service` (logout/login; no spam `NotFoundError`)
- [x] Notificaciones reviews/disputas: `ReviewNotificationsService`, kinds V2, preferencias `notifyManagedReviews` / `notifyReviewEngagement`, bandeja `/me/notifications`
- [x] Reporting admin reseñas públicas: `GET /admin/reviews/report`, vista `/admin/reviews`, export CSV (máx. 500 filas; sin B2B)

_(Trending con `viewCount`: ver ítem Slice 2 arriba en § K.)_

---

## L. Portal usuario final (`/me/*`)

- [x] Etapa 0–1: docs + shared schemas + propuesta Prisma
- [x] Migración Prisma `20260601120000_user_portal_v1` (`UserCart`, `UserFavorite`, `UserExpectedEvent`, `TicketTransferOffer`, `TicketStatus` transfer)
- [x] Script migración `pnpm --filter api run migrate:user-portal-preferences` (dry-run / `--confirm`)
- [x] Backend: dashboard, cart, favorites, expected, activity, account, transfer offers; scanner rechaza `TRANSFER_PENDING`/`TRANSFERRED`
- [x] Backend: verificación manual / smoke script portal
- [x] Frontend: repos/hooks `mePortal`, `UserPortalLayout` `/me`, redirects `/cuenta/*` → `/me/*`
- [x] Carrito API para usuarios autenticados (evento + navbar); invitados siguen con `CartContext`
- [x] `EventEngagementRow` → `/me/favorites` y `/me/expected-events`
- [x] Migrar checkout público: `/checkout` → `/me/cart` si hay sesión; carrito API al agregar; `?orderId=` en checkout por evento
- [x] Detalle ticket portal (`/me/tickets/:id`) + transferencia V1 (crear/cancelar/aceptar)
- [x] Smoke tests API: `pnpm --filter api run smoke:user-portal` — ver `docs/guides/SMOKE_TESTS_GUIDE.md`
- [x] V2: notificaciones reales (cron 24h, email Resend, bandeja `/me/notifications`)
- [x] V2.1.3: push Web/Mobile base (`UserPushSubscription`, `/me/push-subscriptions`, `push-sw.js`, panel `/me/notifications`)
- [x] V2.1.2: reorden UX portal (inicio alertas/recomendados, Mi Carro, preferencias intereses/productoras/ciudad)
- [x] V2.1.4: alertas inteligentes — preferencias push, `deliver()` + canal `PUSH`, transferencias, reviews cron, CTA inicio
- [x] V2.1.4: hook publicación → seguidores productora (`EventPublicationAlertsService` + `FOLLOWED_PRODUCER_NEW_EVENT`)
- [x] V2.1.4: matching ciudad/categoría/subcategoría (`FAVORITE_INTEREST_NEW_CONTENT` + throttling simple por hora)
- [x] UI: preferencias de alertas push en desplegable (`InterestsDisclosure` en `/me/notifications`)
- [x] V2.2: ticket comprador + QR + impresión (`BuyerTicketVisual`, `DefaultBuyerTicket`, `@media print`, smoke `qrPayload`)
- [x] Seguir locales gastro (`UserGastroFollow`, `/me/gastro-follows`, `MePreferencesGastro`, `GastroFollowButton`)
- [x] V2: seguir productoras + recomendaciones (`UserProducerFollow`, `/me/producer-follows`, `/me/recommendations`)
- [x] Etapa 3 portal: pulido transferencia (email receptor, rechazo, cron expiración, textos legales)

---

## M. Scripts developer — auditoría npm (2026)

- [x] **A** Renombres: `seed:subcategories`, `user:restore-master`, `db:reset-dangerous`, `smoke:api`, `smoke:reviews` + `docs/dev/SCRIPTS.md`
- [x] **B** Smokes/E2E sin `@demo.local`; variables `SMOKE_*` / `E2E_*` obligatorias
- [x] **C** `user:inspect`, `user:test-login`, `debug:gastro-discounts`, `debug:admin-api`; scripts legacy fusionados/eliminados
- [x] **D** Cleanup post-smoke + `smoke:cleanup`; usuarios `*@smoke.yo-te-invito.test`; marcador `[smoke-test]` en reviews
- [x] **E** Context docs alineados (`AI_ENTRYPOINT`, `PROJECT_*`, `BACKEND_*`, `FRONTEND_*`, § M)
- [x] **Limpieza documental** `docs/guides/` → vigentes + `docs/legacy/guides/` + `DEVELOPER_SCRIPTS_GUIDE.md` + `SMOKE_TESTS_GUIDE.md`

---

## N. Usuario estándar + limpieza demo (2026-05)

- [x] Portal `/me/*` como hub único; redirects `/cuenta/*` → `/me/*`
- [x] Carrito API + checkout autenticado; `EventEngagementRow` en API
- [x] Transferencia personal V1 (`TicketTransferOffer`); sin marketplace reventa
- [x] Notificaciones `/me/notifications` + cron + push Web/Mobile (V2.1.3–V2.1.4); follows `/me/producer-follows`
- [x] Eliminados: `demo:seed*`, `demo:load`, LocalDB web, `/dev/seed`, `/reventa`, módulo `resale` API
- [x] Eliminados: Next.js `app/api/auth/*` y `app/api/admin/*` (solo NestJS)
- [x] Scripts: `user:*`, `smoke:*` con cleanup; `db:cleanup-content`, `db:reset-dangerous`
- [x] Context + guías developer alineados (`§ M`, `§ N`, `DEVELOPER_USERS.md`)

---

## O. Mejoras cliente V3.1 — auditoría Slice 0 (2026-06-06)

> Checklist: **`docs/dev/Yo_Te_Invito_Checklist_V3_1_Mejoras_Cliente.md`** · Auditoría: **`docs/audits/V3_1_FUNCTIONAL_AUDIT.md`**

- [x] Slice 0 — auditoría funcional/técnica V3.1 (`V3_1_FUNCTIONAL_AUDIT.md`)
- [x] Slice 1 — hints imagen centralizados + contadores (límite 220) + seed subcategorías excursiones (`V3_1_FUNCTIONAL_AUDIT.md` § Slice 1)
- [x] Slice 2 — fondo dark global, calendario/filtros mobile, `PublicDescriptionBlock`, badges cards, maps fallback UX (`V3_1_FUNCTIONAL_AUDIT.md` § Slice 2)
- [x] Slice 3 — menú/categorías mobile (`HomeCategoryStrip` + hero tabs), detalle excursión visual (`ExcursionDetailInfoGrid`)
- [x] Slice 4 — resúmenes 500 / subtítulo productora 400 (`content-limits.ts`, shared + API + web)
- [x] Slice 5 — galería Subir/Bajar en `RentalProductImagesForm` + `sortOrder` en detalle público
- [x] Slice 6 — links/redes gastro + excursiones (`external-links.ts`, migración, `PublicExternalLinksCard`)
- [x] Slice 7 — horarios/punto de encuentro/ubicación excursiones (`excursion-schedule.ts`, migración `20260611120000_excursion_schedule_fields`, formularios admin + `/excursiones/[id]`)
- [x] Slice 7.5 — smoke post-migraciones 6+7 (`smoke:v31-stabilization`, `V3_1_SLICE_7_5_STABILIZATION_SMOKE.md`); PATCH admin opcional (skip 401/403 sin credenciales)
- [x] Slice 8 — subcategorías múltiples fase 1 excursiones (`EventSubcategory`, `ExcursionSubcategoryMultiSelect`)
- [x] Slice 8.5 — smoke subcategorías (`smoke:v31-subcategories`, `V3_1_SLICE_8_5_SUBCATEGORIES_SMOKE.md`)
- [x] Slice 9 — admin archivar/dar de baja (`admin-content-lifecycle`, `V3_1_SLICE_9_ADMIN_ARCHIVE_SMOKE.md`)
- [x] Slice 10 — banners editoriales por categoría (`CategoryEditorialBanner`, `V3_1_SLICE_10_CATEGORY_BANNERS_SMOKE.md`)
- [x] Slice 11 — wizard productora 3 pasos (`V3_1_SLICE_11_PRODUCER_EVENT_WIZARD_SMOKE.md`)
- [x] Slice 12 — legal publicación Caso B informativo (`V3_1_SLICE_12_EVENT_PUBLICATION_LEGAL_SMOKE.md`); Caso A pendiente `producer_terms` publicado
- [x] Slice 13 — ratings 5/5 visual + `ContentCard` editorial fase 1 (`V3_1_SLICE_13_PUBLIC_CARDS_RATINGS_SMOKE.md`)
- [x] Slice 14 — QA pre-deploy (`V3_1_PRE_DEPLOY_QA_CLOSING.md`): migraciones 5/5 OK, builds OK, smokes DB 4/4 OK
- [x] V3.1 — validación DB local (Slice 14): `pnpm db:up` + `migrate deploy` + smokes `v31-*` OK
- [x] Hotfix admin gastro discovery — sync `publicEventId` al activar/editar (`smoke:v31-admin-gastro-discovery`, `V3_1_HOTFIX_ADMIN_GASTRO_DISCOVERY_SMOKE.md`)
- [ ] V3.1 — QA manual browser pre/post-deploy (checklist en `V3_1_PRE_DEPLOY_QA_CLOSING.md` §6)
- [x] Hotfix gastro public links — `/restaurants/[publicEventId]` sin redirect erróneo (`V3_1_HOTFIX_GASTRO_PUBLIC_LINKS.md`)
- [x] Hotfix descripción pública — `RENTAL_DETAIL_SECTION_TITLE` era className, no copy (`V3_1_HOTFIX_PUBLIC_DESCRIPTION_CLASSNAME.md`)
- [ ] Hotfix gastro — QA manual browser post-deploy (`/categoria/gastro`, `/explore?category=gastro`, click card)
- [x] V3.1 Etapa 1 — limpieza `/profiles` + navegación por rol (slices 1.1–1.5 código; doc `V3_1_STAGE_1_PROFILES_NAVIGATION_CLOSING.md`)
- [ ] V3.1 Etapa 1 — QA manual browser navegación por rol (matriz §5 doc cierre)
- [x] V3.1 Etapa 2 — UX pública (filtros, buscador, «Me interesa», fechas) — slices 2.1–2.5 código; doc `V3_1_STAGE_2_PUBLIC_UX_CLOSING.md`
- [ ] V3.1 Etapa 2 — QA manual browser UX pública (matriz §4 doc cierre)
- [ ] V3.1 Etapa 2 — buscador en navbar global (fase 2)
- [x] V3.1 Etapa 3 — cards editoriales fase 2 + ratings 5/5 — slices 3.1–3.8; doc `V3_1_STAGE_3_CARDS_RATINGS_CLOSING.md`
- [ ] V3.1 Etapa 3 — QA manual browser cards + reviews (matriz §7 doc cierre)
- [x] V3.1 Etapa 4 — etiquetas/tags (slices 4.1–4.7); doc `V3_1_STAGE_4_TAGS_CLOSING.md`; checklist §23
- [ ] V3.1 Etapa 4 — pendiente: búsqueda admin publicaciones por tag (§23.1)
- [x] V3.1 Etapa 5 — scanner PWA (slices 5.1–5.8); doc `V3_1_STAGE_5_CLOSING.md`; checklist §24.1–24.4
- [ ] V3.1 Etapa 5 — QA manual móvil + verificación prod `scanner.yoteinvito.club` (§24.2–24.3)
- [x] V3.1 Etapa 6 — PDF entradas (§24.5) + scanner offline (§24.6) — `docs/audits/V3_1_STAGE_6_SCANNER_OFFLINE_CLOSING.md`
- [x] V3.1 Etapa 7 — eventos multi-fecha (§25.1–25.2, slices 7.1–7.10) — `docs/audits/V3_1_STAGE_7_MULTI_DATE_EVENTS_CLOSING.md`; smoke `smoke:v31-event-occurrences`
- [ ] V3.1 Etapa 7 — QA manual puerta multi-fecha + regresión single-date en dispositivo
- [ ] V3.1 Etapa 8 — cambio de fecha de entrada por usuario (§25.3)
- [ ] V3.1 Scanner PWA prod — JWT login (pendiente desde Etapa 5)
- [ ] V3.1 — restante no bloqueante (maps prod §4.1, §5.2 links en descripciones, multi-subcategorías otras verticales, drag galería, migración DB ratings 1–5)
- [x] V3.1 Etapa 11 — legales Caso A código (`EVENT_PUBLICATION`, bloqueo `PENDING`) — `V3_1_STAGE_11_LEGAL_CLOSING.md`
- [ ] V3.1 Etapa 11 — QA manual browser legales + publicar `producer_terms` real (cliente)

---

## Referencias

| Documento | Uso |
|-----------|-----|
| `AI_ENTRYPOINT.md` | Índice IA + dev/QA rápido |
| `PROJECT_CONTEXT.md` | Visión + monorepo |
| `BACKEND_CONTEXT.md` | API + Prisma + scripts |
| `FRONTEND_CONTEXT.md` | Web + rentals UI + E2E |
| `FRONTEND_DEMO_NOTES.md` | Histórico demo |
| `guides/DEVELOPER_SCRIPTS_GUIDE.md` | Manual comandos npm |
| `guides/SMOKE_TESTS_GUIDE.md` | Smokes + E2E |
| `guides/README.md` | Índice guías vigentes |
| `docs/dev/SCRIPTS.md` | Referencia técnica IA |
| `legacy/guides/` | Histórico archivado |
| `docs/guides/DEMO_REMOVAL.md` | Regla pago demo / no datos demo |
| `docs/reviews/REVIEWS_V2.md` | Comentarios y valoraciones V2 |
| `docs/user/USER_PORTAL.md` | Portal usuario + push (V2.1.3–V2.1.4) + ticket (V2.2) |
| `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` | Checklist operativo V2 → producción |
| `docs/audits/GASTRO_HOTELES_V2_AUDIT.md` | Auditoría cierre Gastro/Hoteles V2 |
| `docs/audits/PUBLIC_FOOTER_AUDIT.md` | Footer público — bloque cerrado Slices 1–5 (2026-05-24) |
| `docs/audits/PUBLIC_FOOTER_SMOKE.md` | Smoke / QA footer público |
| `docs/audits/PUBLIC_FOOTER_CLOSING_AUDIT.md` | Auditoría de cierre bloque footer (2026-05-24) |
| `docs/hotel/HOTEL_E2E.md` | E2E Playwright vertical hotel |
| `docs/gastro/GASTRO_DISCOUNT_QR.md` | QR descuentos gastro v1 |
| `docs/audits/PREPRODUCTION_DEPLOY_AUDIT.md` | Preproducción / plan Producción técnica (Infra 1) |
| `docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md` | Runbook DonWeb + §24 ejecución real (Infra 2B) |
| `docs/emails/EMAILS_ARCHITECTURE.md` | Emails: auditoría + plan SMTP DonWeb |
| `docs/emails/EMAIL_MATRIX.md` | Matriz inicial de envíos por clase |
| `docs/user/USER_PORTAL_PRISMA_PROPOSAL.md` | Diff modelo (pre-migrate) |
| `docs/audits/V3_1_FUNCTIONAL_AUDIT.md` | Auditoría funcional V3.1 — Slice 0 (orden de implementación) |
| `docs/audits/V3_1_PRE_DEPLOY_QA_CLOSING.md` | QA pre-deploy V3.1 — Slice 14 (migraciones, smokes, deploy VPS) |
| `docs/audits/V3_1_HOTFIX_ADMIN_GASTRO_DISCOVERY_SMOKE.md` | Hotfix admin gastro → discovery público |
| `docs/audits/V3_1_HOTFIX_GASTRO_PUBLIC_LINKS.md` | Hotfix links cards gastro (`/restaurants` vs `/gastronomicos`) |
| `docs/dev/Yo_Te_Invito_Checklist_V3_1_Mejoras_Cliente.md` | Checklist mejoras cliente V3.1 (source of truth) |
| `docs/audits/V3_1_STAGE_2_PUBLIC_UX_CLOSING.md` | Cierre V3.1 Etapa 2 — UX pública |
| `docs/audits/V3_1_STAGE_3_CARDS_RATINGS_CLOSING.md` | Cierre V3.1 Etapa 3 — cards + ratings 5/5 |
| `docs/audits/V3_1_STAGE_4_TAGS_CLOSING.md` | Cierre V3.1 Etapa 4 — etiquetas/tags |
| `docs/audits/V3_1_STAGE_5_CLOSING.md` | Cierre V3.1 Etapa 5 — scanner PWA (5.1–5.8) |
| `docs/audits/V3_1_STAGE_7_MULTI_DATE_EVENTS_CLOSING.md` | Cierre V3.1 Etapa 7 — eventos multi-fecha (7.1–7.10) |
| `docs/audits/V3_1_STAGE_5_SCANNER_ACCOUNTS_SMOKE.md` | Smoke ownership `ScannerAccount` |
| `docs/audits/V3_1_STAGE_5_SCANNER_USERS_SMOKE.md` | Smoke gestión usuarios scanner portales |

