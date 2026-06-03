# Cierre técnico — Bloque emails transaccionales y operativos

**Proyecto:** Yo Te Invito  
**Fecha:** 2026-06-01  
**Slice:** Emails 10 (cleanup parcial + documentación)  
**Estado:** Bloque **cerrado técnicamente** para auth, portal, reviews, referidos, alertas con email activo y operaciones admin conectadas. **Fuera de alcance:** checkout real, pagos aprobado/rechazado/pendiente, factura, webhooks, facturación, migración completa de payouts.

Documentos de referencia: [`EMAILS_ARCHITECTURE.md`](./EMAILS_ARCHITECTURE.md) · [`EMAIL_MATRIX.md`](./EMAIL_MATRIX.md)

---

## 1. Resumen del bloque (Slices 1–10)

| Slice | Entregable |
|-------|------------|
| 1 | Auditoría + `EMAILS_ARCHITECTURE.md` + `EMAIL_MATRIX.md` |
| 2 | `MailProvider`, Resend + SMTP (Nodemailer), `MAIL_PROVIDER`, `smoke:email` |
| 3 | Layout, renderer, registry, `sendTemplate()`, `smoke:email-template` |
| 3b | Callers piloto + `enqueueTemplate()` + `deliver(emailTemplateId)` |
| 4 | Auth verify + bienvenidas por perfil + evento aprobado/rechazado |
| 5 | Transferencias (4) + `EVENT_REMINDER_24H` + migración Prisma |
| 6 | Reviews/disputas/moderación (7 templates) |
| 7 | Referidos V2 (7 templates) + disclaimer no custodia |
| 8 | Alertas inteligentes (5 templates; 3 con email en prod según flags) |
| 9 | Admin/operaciones (5 + `ADMIN_CRITICAL_ALERT`) + anti-loop delivery failed |
| 10 | Cleanup legacy muerto + este documento + sync checklists |

---

## 2. Registry — 38 templates

Fuente de verdad: `apps/api/src/email/templates/email-template.types.ts` (`EMAIL_TEMPLATE_IDS`).

- **Sin duplicados** en el array ni en `email-template.registry.ts`.
- **Smoke:** cada ID tiene variables de ejemplo en `apps/api/scripts/smoke-email-template.ts` (`sampleVariables`).
- **Render:** un archivo `*.template.ts` por ID bajo `templates/templates/`.

Lista por familia:

| Familia | IDs (count) |
|---------|-------------|
| Auth | `AUTH_WELCOME_BUYER`, `AUTH_WELCOME_PRODUCER`, `AUTH_WELCOME_GASTRO`, `AUTH_WELCOME_HOTEL`, `AUTH_WELCOME_REFERRER`, `AUTH_VERIFY_EMAIL` (6) |
| Productora | `PRODUCER_EVENT_APPROVED`, `PRODUCER_EVENT_REJECTED` (2) |
| Portal / tickets | `TICKET_TRANSFER_*` (4), `EVENT_REMINDER_24H` (1) |
| Reviews | `REVIEW_*` (7) |
| Referidos | `REFERRAL_*` (7) |
| Alertas | `FAVORITE_EVENT_SOON`, `EXPECTED_EVENT_SOON`, `FOLLOWED_PRODUCER_NEW_EVENT`, `FAVORITE_INTEREST_NEW_CONTENT`, `FOLLOWED_GASTRO_NEW_DISCOUNT` (5) |
| Admin / ops | `ADMIN_CRITICAL_ALERT`, `ADMIN_NEW_EVENT_PENDING`, `ADMIN_OPERATIONAL_ERROR`, `ADMIN_EMAIL_DELIVERY_FAILED`, `ADMIN_SCANNER_CRITICAL_ERROR`, `ADMIN_STORAGE_UPLOAD_FAILED` (6) |

**Total: 38**

---

## 3. Templates con caller real (producción)

| ID | Caller |
|----|--------|
| `AUTH_VERIFY_EMAIL` | `AuthService.register` → `enqueueTemplate` |
| `AUTH_WELCOME_*` (5) | `AuthService.register` → `enqueueTemplate` |
| `PRODUCER_EVENT_APPROVED` / `REJECTED` | `ProducerEventStatusNotificationsService` → `deliver()` |
| `TICKET_TRANSFER_*` (4) | `TicketTransferOfferService` → `deliver()` |
| `EVENT_REMINDER_24H` | `NotificationsSchedulerService` cron → `deliver()` |
| `REVIEW_*` (7) | `ReviewNotificationsService` → `deliver()` |
| `REFERRAL_*` (7) | `ReferralEmailsService` → `enqueueTemplate` |
| `FAVORITE_EVENT_SOON` | Cron favoritos (`sendEmail` según prefs) |
| `EXPECTED_EVENT_SOON` | Cron esperados |
| `FOLLOWED_GASTRO_NEW_DISCOUNT` | `GastroFollowDiscountAlertsService` |
| `ADMIN_NEW_EVENT_PENDING` | `ProducerEventsCrudService` → `PENDING` |
| `ADMIN_STORAGE_UPLOAD_FAILED` | `UploadsService` fallo GCS |
| `ADMIN_EMAIL_DELIVERY_FAILED` | `EmailQueueService` al fallar envío (excluye `ADMIN_*` fuente) |
| `ADMIN_CRITICAL_ALERT` | `OperationalAlertsEmailService.enqueueCriticalAlert()` (API manual / futuros hooks) |

**Legacy con caller (fuera del registry):**

| Función / origen | Caller | Notas |
|------------------|--------|-------|
| `renderOrderConfirmationEmail` | `public-payments.service.ts` (orden PAID) | Bloque **pagos/checkout** |
| `renderPayoutRequestEmail` / `renderPayoutReceivedConfirmation` | `payouts.service.ts` | Bloque **payouts** |
| HTML inline | `admin-gastro.service.ts`, `public-gastro-discounts.service.ts` | QR descuento gastro; no confundir con `FOLLOWED_GASTRO_NEW_DISCOUNT` |

---

## 4. Templates listos sin caller automático

| ID | Motivo |
|----|--------|
| `ADMIN_OPERATIONAL_ERROR` | Listo; uso manual vía `OperationalAlertsEmailService` |
| `ADMIN_SCANNER_CRITICAL_ERROR` | Listo; sin punto seguro en scanner (evitar ruido/falsos positivos) |
| `FOLLOWED_PRODUCER_NEW_EVENT` | Cron/smart alerts con `sendEmail: false` |
| `FAVORITE_INTEREST_NEW_CONTENT` | idem |
| — | `REVIEW_PENDING_REMINDER`: **sin template**; cron reviews solo in-app (`sendEmail: false`) |

---

## 5. Legacy eliminado en Slice 10

| Función | Estado |
|---------|--------|
| `renderWelcomeEmail` | **Eliminada** — sin callers; reemplazada por `AUTH_WELCOME_*` |
| `renderVerificationEmail` | **Eliminada** — sin callers; reemplazada por `AUTH_VERIFY_EMAIL` |

---

## 6. Legacy que permanece (y por qué)

Archivo: `apps/api/src/email/email-templates.ts` (solo 3 exports).

| Función | Motivo |
|---------|--------|
| `renderOrderConfirmationEmail` | Checkout / pago aprobado — migrar con bloque pagos reales |
| `renderPayoutRequestEmail` | Notificación admin retiro |
| `renderPayoutReceivedConfirmation` | Confirmación productor retiro |

**No migrar en este slice:** webhooks, estados de pago pendiente/rechazado, factura AFIP, `EmailOutboundLog`, reintentos BullMQ explícitos.

---

## 7. Pendiente explícito — bloque pagos / checkout / facturación

- Email orden creada / pago pendiente / rechazado (registry + idempotencia).
- Ticket emitido (adjunto o link dedicado).
- Factura por email.
- Webhooks y alertas admin de pago/reconciliación.
- Migrar `renderOrderConfirmationEmail` a template registry.
- Migrar payouts a templates + `MAIL_OPERATIONS_TO` si aplica.
- `AUTH_PASSWORD_RESET` cuando exista flujo API.

---

## 8. Variables de entorno (sin secretos)

```env
MAIL_PROVIDER=smtp
SMTP_HOST=c2821613.ferozo.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no_reply@yoteinvito.club
SMTP_PASSWORD=<secret>
MAIL_FROM="Yo Te Invito <no_reply@yoteinvito.club>"
MAIL_REPLY_TO=soporte@yoteinvito.club
MAIL_OPERATIONS_TO=operaciones@yoteinvito.club
```

Rollback dev/staging: `MAIL_PROVIDER=resend` + `RESEND_API_KEY`.

Opcionales: `APP_URL`, `REDIS_URL` (cola), `ADMIN_EMAIL` (fallback ops).

---

## 9. Deploy en VPS

```bash
cd /opt/yoteinvito
git pull origin main
pnpm install --frozen-lockfile
cd apps/api
npx prisma generate
npx prisma migrate deploy
cd /opt/yoteinvito
pnpm build
sudo systemctl restart yti-api yti-web yti-scanner
```

**Importante:**

- Usar `npx prisma migrate deploy` en producción; **no** `pnpm db:migrate`.
- Configurar el bloque SMTP en el env del servicio API antes del smoke en servidor.
- Reiniciar API tras cambiar env.

### Migración del bloque emails

`20260607120000_transfer_status_notification_kinds` — añade valores a `NotificationKind`:

- `TICKET_TRANSFER_ACCEPTED`
- `TICKET_TRANSFER_REJECTED`
- `TICKET_TRANSFER_CANCELLED`

Si ya está aplicada, `migrate deploy` es idempotente.

---

## 10. Smoke recomendado

Build:

```bash
pnpm build
```

Un template (ejemplo verify):

```bash
MAIL_PROVIDER=smtp \
SMTP_HOST=c2821613.ferozo.com \
SMTP_PORT=465 \
SMTP_SECURE=true \
SMTP_USER=no_reply@yoteinvito.club \
SMTP_PASSWORD='***' \
MAIL_FROM='Yo Te Invito <no_reply@yoteinvito.club>' \
MAIL_REPLY_TO='soporte@yoteinvito.club' \
MAIL_OPERATIONS_TO=operaciones@yoteinvito.club \
SMOKE_EMAIL_TO=soporte@yoteinvito.club \
SMOKE_EMAIL_TEMPLATE_ID=AUTH_VERIFY_EMAIL \
pnpm --filter api run smoke:email-template
```

**Un ID por familia** (no envíos masivos; repetir comando cambiando `SMOKE_EMAIL_TEMPLATE_ID`):

| Familia | `SMOKE_EMAIL_TEMPLATE_ID` |
|---------|---------------------------|
| Auth | `AUTH_VERIFY_EMAIL` |
| Productora | `PRODUCER_EVENT_APPROVED` |
| Portal | `TICKET_TRANSFER_RECEIVED` |
| Reviews | `REVIEW_RECEIVED` |
| Referidos | `REFERRAL_PROPOSAL_RECEIVED` |
| Alertas | `FOLLOWED_GASTRO_NEW_DISCOUNT` |
| Admin | `ADMIN_NEW_EVENT_PENDING` |
| Admin genérico | `ADMIN_CRITICAL_ALERT` |

---

## 11. Riesgos mitigados en este cierre

- No se eliminaron funciones con callers activos (checkout/payouts).
- No se marcó checkout/facturación/webhooks como completos en checklists de producto.
- No se commitean passwords.
- Push/in-app y `NotificationDeliveryLog` sin cambios de comportamiento.
- Anti-loop en `ADMIN_EMAIL_DELIVERY_FAILED` para templates `ADMIN_*`.

---

## 12. Próximos pasos (post-bloque)

1. Activar SMTP en VPS prod + `smoke:email` / un `smoke:email-template` desde servidor.
2. Aplicar migración transfer kinds si falta en prod.
3. Bloque pagos reales: registry para checkout, idempotencia, factura, webhooks.
4. `REVIEW_PENDING_REMINDER` template + email si producto lo habilita.
5. Caller seguro para `ADMIN_SCANNER_CRITICAL_ERROR`.
6. `EmailOutboundLog` + reintentos BullMQ (mejora infra, no slice de producto).
