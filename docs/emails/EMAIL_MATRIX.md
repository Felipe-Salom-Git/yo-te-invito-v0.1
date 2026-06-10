# Matriz inicial de emails — Yo Te Invito

**Versión:** 1.0 (Slice Emails 1–10 — cierre técnico)  
**Cierre:** [`EMAILS_CLOSING_AUDIT.md`](./EMAILS_CLOSING_AUDIT.md)  
**Leyenda clase:** `CRÍTICO` · `OPERATIVO` · `OPCIONAL`  
**Estado:** `✓` implementado · `~` parcial · `○` planificado (checklist V2)  
**Transporte (Slice 2):** todos los envíos implementados usan `EmailService` → `MailProvider` (`MAIL_PROVIDER=smtp` o `resend`).

**Validación SMTP DonWeb (local):** `smoke:email` OK con `MAIL_PROVIDER=smtp` y host `c2821613.ferozo.com` (puerto 465). Pendiente: activar el mismo bloque en env del API en VPS prod.

**Templates registry (Slices 3–9):**

| ID | Caller real | Idempotencia / notas |
|----|-------------|----------------------|
| `AUTH_VERIFY_EMAIL` | `AuthService.register` → `enqueueTemplate` | Mismo token/link/expiración; no loguear token |
| `AUTH_WELCOME_BUYER` | `register` si `profileType === 'USER'` | 1 verify + 1 welcome por registro |
| `AUTH_WELCOME_PRODUCER` | `register` si `PRODUCER` | Variables desde `profileData.displayName` |
| `AUTH_WELCOME_GASTRO` | `register` si `GASTRO` | idem |
| `AUTH_WELCOME_HOTEL` | `register` si `HOTEL` | idem |
| `AUTH_WELCOME_REFERRER` | `register` si `REFERRER` | idem |
| `PRODUCER_EVENT_APPROVED` | `ProducerEventStatusNotificationsService` (`APPROVED`) | `deliver()` + `NotificationDeliveryLog` |
| `PRODUCER_EVENT_REJECTED` | idem (`REJECTED`) | In-app/push sin cambios; email fire-and-forget |
| `TICKET_TRANSFER_RECEIVED` | `TicketTransferOfferService.create` (`TRANSFER_OFFER_PENDING`) | `transfer:{offerId}` |
| `TICKET_TRANSFER_ACCEPTED` | `accept` → emisor | `transfer:{offerId}:accepted` |
| `TICKET_TRANSFER_REJECTED` | `reject` → emisor | `transfer:{offerId}:rejected` |
| `TICKET_TRANSFER_CANCELLED` | `cancel` → receptor (si hay `buyerUserId`) | `transfer:{offerId}:cancelled` |
| `TICKET_TRANSFER_EXPIRED` | `expireOffer` (cron) → emisor + receptor | `transfer:{offerId}:expired` |
| `EVENT_REMINDER_24H` | Cron `NotificationsSchedulerService` | `ticket:{ticketId}`; prefs por ticket |
| `REVIEW_RECEIVED` | `ReviewNotificationsService.notifyReviewReceived` | `notifyManagedReviews` + `emailNotificationsEnabled` |
| `REVIEW_OFFICIAL_REPLY` | `notifyOfficialReply` | `notifyReviewEngagement` |
| `REVIEW_DISPUTE_CREATED` | `notifyDisputeCreated` | `notifyManagedReviews` |
| `REVIEW_DISPUTE_ACCEPTED` | `notifyDisputeAccepted` | idem |
| `REVIEW_DISPUTE_REJECTED` | `notifyDisputeRejected` | idem |
| `REVIEW_MODERATION_HIDDEN` | `notifyReviewHidden` | `notifyReviewEngagement` |
| `REVIEW_MODERATION_RESTORED` | `notifyReviewRestored` | idem |
| `REFERRAL_PRODUCER_ASSOCIATED` | `ReferralsService` (relación `ACTIVE`) | `enqueueTemplate`; sin `NotificationKind` |
| `REFERRAL_PROPOSAL_RECEIVED` | `ReferralProposalsService.createForProducer` | email a referido |
| `REFERRAL_PROPOSAL_ACCEPTED` | `ReferralProposalsService.acceptForReferrer` | email a productora |
| `REFERRAL_PROPOSAL_REJECTED` | `ReferralProposalsService.rejectForReferrer` | email a productora |
| `REFERRAL_COMMISSION_GENERATED` | `PublicPaymentsService` tras orden `PAID` si `created` | solo comisión nueva |
| `REFERRAL_PAYMENT_REQUEST_CREATED` | `ReferralPaymentRequestsService.createForReferrer` | email a productora |
| `REFERRAL_PAYMENT_MARKED_AS_PAID` | `ReferralPaymentRequestsService.markPaidForProducer` | email a referido |
| `FAVORITE_EVENT_SOON` | Cron `NotificationsSchedulerService` | `favorite:{eventId}`; email si flags favorito + global |
| `EXPECTED_EVENT_SOON` | idem | `expected:{eventId}` |
| `FOLLOWED_PRODUCER_NEW_EVENT` | `SmartAlertsPreparedService` | **email off** (`sendEmail: false`); template para smoke |
| `FAVORITE_INTEREST_NEW_CONTENT` | idem | **email off**; template para smoke |
| `FOLLOWED_GASTRO_NEW_DISCOUNT` | `GastroFollowDiscountAlertsService` | inline → template; throttling sin cambios |
| `ADMIN_CRITICAL_ALERT` | `OperationalAlertsEmailService.enqueueCriticalAlert` | `MAIL_OPERATIONS_TO` |
| `ADMIN_NEW_EVENT_PENDING` | `ProducerEventsCrudService` → `PENDING` | operaciones |
| `ADMIN_OPERATIONAL_ERROR` | template listo | caller manual / futuro |
| `ADMIN_EMAIL_DELIVERY_FAILED` | `EmailQueueService` si falla send no-ADMIN | sin loop |
| `ADMIN_SCANNER_CRITICAL_ERROR` | template listo | caller pendiente |
| `ADMIN_STORAGE_UPLOAD_FAILED` | `UploadsService` fallo GCS | no validación formato |

Probar: `SMOKE_EMAIL_TEMPLATE_ID=<ID> SMOKE_EMAIL_TO=... pnpm --filter api run smoke:email-template`.

**Disclaimer referidos:** texto de no custodia en templates económicos (`referral-email-layout.util.ts`).

---

## 1. Auth y cuenta

| ID | Evento | Clase | Destinatario | Implementado | Canal | Preferencias | Template / notas |
|----|--------|-------|--------------|--------------|-------|--------------|------------------|
| AUTH-01 | Registro — verificación email | CRÍTICO | Usuario | ✓ | Cola | No | `AUTH_VERIFY_EMAIL` |
| AUTH-02 | Registro — bienvenida | OPCIONAL* | Usuario | ✓ | Cola | No hoy | `AUTH_WELCOME_*` por `profileType`; *reclasificar si producto lo define |
| AUTH-03 | Reset password | CRÍTICO | Usuario | ○ | — | No | No existe flujo email (solo script CLI `user:reset-password`) |
| AUTH-04 | Email verificado (confirmación) | OPCIONAL | Usuario | ○ | — | — | Solo cambio estado en BD |

---

## 2. Comprador / checkout

| ID | Evento | Clase | Destinatario | Implementado | Canal | Preferencias | Template / notas |
|----|--------|-------|--------------|--------------|-------|--------------|------------------|
| BUY-01 | Pago aprobado / compra confirmada | CRÍTICO | `order.buyerEmail` | ✓ | Cola | No | `renderOrderConfirmationEmail`; **sin idempotencia** |
| BUY-02 | Orden creada / pago pendiente | CRÍTICO | Comprador | ○ | — | — | Checklist V2 |
| BUY-03 | Ticket emitido (adjunto/link) | CRÍTICO | Comprador | ○ | — | — | Checklist V2 § checkout |
| BUY-04 | Factura AFIP por email | CRÍTICO | Comprador | ○ | — | — | Bloque facturación; `facturacion@` futuro |

---

## 3. Notificaciones portal (`UserNotificationsService.deliver`)

Idempotencia: `NotificationDeliveryLog` + `referenceKey`. Email con template cuando está migrado.

| ID | `NotificationKind` | Clase | Preferencias email | Template email |
|----|-------------------|-------|-------------------|----------------|
| NTF-01 | `TICKET_REMINDER_24H` | OPCIONAL | `emailNotificationsEnabled` + `ticketReminder24hEnabled` | `EVENT_REMINDER_24H` |
| NTF-02 | `FAVORITE_EVENT_SOON` | OPCIONAL | `emailNotificationsEnabled` + favorito + `favoriteEntityNotificationsEnabled` | `FAVORITE_EVENT_SOON` |
| NTF-03 | `EXPECTED_EVENT_SOON` | OPCIONAL | `emailNotificationsEnabled` + esperado + `expectedEventNotificationsEnabled` | `EXPECTED_EVENT_SOON` |
| NTF-04 | `TRANSFER_OFFER_PENDING` | OPCIONAL | `emailNotificationsEnabled` | `TICKET_TRANSFER_RECEIVED` |
| NTF-04b | `TICKET_TRANSFER_ACCEPTED` | OPCIONAL | `emailNotificationsEnabled` | `TICKET_TRANSFER_ACCEPTED` |
| NTF-04c | `TICKET_TRANSFER_REJECTED` | OPCIONAL | `emailNotificationsEnabled` | `TICKET_TRANSFER_REJECTED` |
| NTF-04d | `TICKET_TRANSFER_CANCELLED` | OPCIONAL | `emailNotificationsEnabled` | `TICKET_TRANSFER_CANCELLED` |
| NTF-05 | `REVIEW_PENDING` | OPCIONAL | `notifyPendingReviews` | solo in-app |
| NTF-06 | `FOLLOWED_PRODUCER_NEW_EVENT` | OPCIONAL | push `notifyFollowedProducers`; **email no** (in-app/push) | template listo |
| NTF-07 | `FAVORITE_INTEREST_NEW_CONTENT` | OPCIONAL | push categorías/recomendados; **email no** | template listo |
| NTF-08 | `FOLLOWED_GASTRO_NEW_DISCOUNT` | OPCIONAL | email follow + global | `FOLLOWED_GASTRO_NEW_DISCOUNT` |
| NTF-09 | `EVENT_APPROVED_BY_ADMIN` | OPCIONAL | `emailNotificationsEnabled` + `notifyProducerEventStatus` | ✓ |
| NTF-10 | `EVENT_REJECTED_BY_ADMIN` | OPCIONAL | idem | ✓ |
| NTF-11 | `REVIEW_RECEIVED` | OPCIONAL | `notifyManagedReviews` | `REVIEW_RECEIVED` |
| NTF-12 | `REVIEW_OFFICIAL_REPLY` | OPCIONAL | `notifyReviewEngagement` | `REVIEW_OFFICIAL_REPLY` |
| NTF-13 | `REVIEW_DISPUTE_CREATED` | OPCIONAL | `notifyManagedReviews` | `REVIEW_DISPUTE_CREATED` |
| NTF-13b | `REVIEW_DISPUTE_ACCEPTED` | OPCIONAL | `notifyManagedReviews` | `REVIEW_DISPUTE_ACCEPTED` |
| NTF-13c | `REVIEW_DISPUTE_REJECTED` | OPCIONAL | `notifyManagedReviews` | `REVIEW_DISPUTE_REJECTED` |
| NTF-14 | `REVIEW_MODERATION_HIDDEN` | OPCIONAL | `notifyReviewEngagement` | `REVIEW_MODERATION_HIDDEN` |
| NTF-14b | `REVIEW_MODERATION_RESTORED` | OPCIONAL | `notifyReviewEngagement` | `REVIEW_MODERATION_RESTORED` |

**Push:** mismos kinds con `shouldSendPushForKind` (UI en `MePushAlertPreferences`).

---

## 4. Productor / payouts

| ID | Evento | Clase | Destinatario | Implementado | Notas |
|----|--------|-------|--------------|--------------|-------|
| PRO-01 | Solicitud de retiro | OPERATIVO | `ADMIN_EMAIL` o `MAIL_OPERATIONS_TO` | ✓ | `renderPayoutRequestEmail` |
| PRO-02 | Confirmación retiro recibida | CRÍTICO/OPCIONAL | Email productor | ✓ | `renderPayoutReceivedConfirmation` |

---

## 5. Gastro

| ID | Evento | Clase | Destinatario | Implementado | Notas |
|----|--------|-------|--------------|--------------|-------|
| GAS-01 | Admin activa descuento → QR al local | OPERATIVO | `gastroProfile.contactEmail` | ✓ | Síncrono; campos `emailSentAt` en descuento |
| GAS-02 | Usuario reclama descuento público | OPERATIVO | Email del claim | ✓ | `public-gastro-discounts`; síncrono |
| GAS-03 | Seguidores — nuevo descuento | OPCIONAL | Usuarios follow | ✓ | `FOLLOWED_GASTRO_NEW_DISCOUNT` template |

---

## 6. Referidos V2 (Slice 7)

Canal: **`EmailQueueService.enqueueTemplate`** (operativo; sin in-app/push). Sin migración Prisma nueva.

| ID | Evento | Clase | Destinatario | Template | Preferencias |
|----|--------|-------|--------------|----------|--------------|
| REF-01 | Asociación `ACTIVE` | OPERATIVO | Referido (membresías activas) | `REFERRAL_PRODUCER_ASSOCIATED` | No hay toggle específico; email operativo del portal |
| REF-02 | Propuesta enviada | OPERATIVO | Referido | `REFERRAL_PROPOSAL_RECEIVED` | idem |
| REF-03 | Propuesta aceptada | OPERATIVO | Productora | `REFERRAL_PROPOSAL_ACCEPTED` | idem |
| REF-04 | Propuesta rechazada | OPERATIVO | Productora | `REFERRAL_PROPOSAL_REJECTED` | idem |
| REF-05 | Comisión generada (venta atribuida) | OPERATIVO | Referido | `REFERRAL_COMMISSION_GENERATED` | idem; lenguaje “comisión generada registrada” |
| REF-06 | Solicitud de pago registrada | OPERATIVO | Productora | `REFERRAL_PAYMENT_REQUEST_CREATED` | idem |
| REF-07 | Pago marcado como realizado | OPERATIVO | Referido | `REFERRAL_PAYMENT_MARKED_AS_PAID` | idem; productora marcó, no YTI |

---

## 7. Admin / operaciones (Slice 9)

Destino por defecto: `MAIL_OPERATIONS_TO` (no hardcodear en código).

| ID | Evento | Clase | Template | Caller |
|----|--------|-------|----------|--------|
| ADM-01 | Evento pasa a `PENDING` | OPERATIVO | `ADMIN_NEW_EVENT_PENDING` | `ProducerEventsCrudService.update` |
| ADM-02 | Error operativo genérico | OPERATIVO | `ADMIN_OPERATIONAL_ERROR` | template listo |
| ADM-03 | Fallo envío email transaccional | OPERATIVO | `ADMIN_EMAIL_DELIVERY_FAILED` | cola si falla (excl. `ADMIN_*`) |
| ADM-04 | Alerta genérica | OPERATIVO | `ADMIN_CRITICAL_ALERT` | `enqueueCriticalAlert()` |
| ADM-05 | Scanner crítico | OPERATIVO | `ADMIN_SCANNER_CRITICAL_ERROR` | template listo |
| ADM-06 | Storage/upload GCS | OPERATIVO | `ADMIN_STORAGE_UPLOAD_FAILED` | `UploadsService` error GCS |

**Pendiente (sin conectar):** `ADMIN_CRITICAL_PAYMENT_ERROR`, `ADMIN_CRITICAL_INVOICE_ERROR`, webhooks, facturación.

---

## 8. Mapeo remitentes (DonWeb)

| Tipo mail | `From` sugerido | `Reply-To` |
|-----------|-----------------|------------|
| Transaccional usuario | `no-reply@yoteinvito.club` | `soporte@yoteinvito.club` |
| Operaciones internas | `no-reply@yoteinvito.club` o `operaciones@yoteinvito.club` | `soporte@yoteinvito.club` |
| Futuro facturación | `facturacion@yoteinvito.club` | `soporte@yoteinvito.club` |

---

## 9. Evolución de la matriz

Completar en Slice 3 con:

- subject lines finales por idioma (es-AR)
- variables de template
- prioridad de implementación vs checklist `Yo_Te_Invito_Checklist_V2_2_Pendientes_Produccion.md` §4
