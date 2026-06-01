# Getnet Reconciliation — Yo Te Invito

**Slice C** (2026-06-01) — reconciliación operativa, órdenes expiradas y recuperación sin facturación ni reembolsos automáticos.

---

## 1. Objetivo

Detectar y resolver (o marcar) desincronías entre Getnet y la base local, compartiendo reglas entre **webhook**, **polling** y **script batch**, sin duplicar tickets ni degradar estados finales.

---

## 2. Problemas que resuelve

| Problema | Comportamiento V1 |
|----------|-------------------|
| Pago remoto `APPROVED`, orden vigente | Fulfill vía `OrderFulfillmentService` |
| Orden `EXPIRED` + remoto `APPROVED` | **Sin tickets** — `REQUIRES_MANUAL_REVIEW` + alerta |
| Orden `PAID` por otro `Payment` | **Sin tickets** — revisión manual |
| Webhook/poll duplicados | Idempotencia fulfill + metadata |
| `Payment` `APPROVED` + remoto `REJECTED` tardío | No degradar pago |
| `REFUNDED` remoto | Metadata / ignorado — sin reversa |

---

## 3. Relación con webhook

`GetnetWebhookService` delega en `GetnetReconciliationService.reconcilePayment` con `remoteStatusOverride` (sin segunda llamada Getnet si el body trae estado).

Sigue registrando `getnetWebhookEvents` en metadata.

---

## 4. Relación con polling

`PublicPaymentsService.refreshPaymentStatus` consulta Getnet una vez y llama `reconcilePayment` con `source: GETNET_POLL` y `remoteStatusOverride`.

`POST /public/payments/:paymentId/refresh-status` (Slice D) usa el mismo refresh y devuelve `CheckoutPaymentStatusResponse` para `/checkout/return`.

Ver [GETNET_CHECKOUT_RETURN_FLOW.md](./GETNET_CHECKOUT_RETURN_FLOW.md).

`POST /admin/payments/:paymentId/reconcile` (Slice E) usa `source: ADMIN_MANUAL` — ver [GETNET_ADMIN_PAYMENTS.md](./GETNET_ADMIN_PAYMENTS.md).

---

## 5. Relación con OrderFulfillmentService

Solo se invoca `fulfillPaidOrder` cuando la política devuelve `FULFILL`:

* Orden `PENDING_PAYMENT` no expirada.
* Tickets incompletos.
* No hay conflicto con otro pago aprobado en orden ya `PAID`.

`rejectIfExpired: false` en rutas Getnet (poll/webhook/script).

---

## 6. Política V1: orden expirada + pago aprobado

Cuando `Order.status === EXPIRED` o `PENDING_PAYMENT` con `expiresAt < now`:

1. **No** emitir tickets (stock pudo liberarse en `OrderExpirationService`).
2. Actualizar `Payment` → `APPROVED` si corresponde.
3. Metadata:

```json
{
  "reconciliationStatus": "REQUIRES_MANUAL_REVIEW",
  "reconciliationReason": "ORDER_EXPIRED_PAYMENT_APPROVED",
  "reconciliationSource": "GETNET_WEBHOOK"
}
```

4. Alerta operativa (deduplicada por `reconciliationAlertReason`).
5. Orden permanece `EXPIRED` hasta resolución manual (Slice futuro / ops).

### Expiración de órdenes (auditoría)

| Componente | Rol |
|------------|-----|
| `PublicOrdersService.create` | Reserva batch + decrementa `capacityAvailable`; `expiresAt` +15 min |
| `OrderExpirationService` | Cron cada 3 min + `POST /internal/jobs/expire-orders` |
| Al expirar | `Order` → `EXPIRED`, `releaseReservation`, incrementa `capacityAvailable`, `AuditLog` |
| `Payment` | No se cancela automáticamente — puede quedar `PENDING` |

---

## 7. Múltiples payments por orden

El modelo permite **varios** `Payment` por `orderId`.

Si la orden ya tiene tickets completos y otro pago está `APPROVED`:

* Nuevo pago aprobado → `ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT` + revisión manual.
* Sin constraint único en este slice.

---

## 8. Estados remotos y estados internos

Reutiliza `mapGetnetWebhookStatusToLocal` / `shouldApplyPaymentStatusUpdate`.

Outcomes de reconciliación: `FULFILLED`, `ALREADY_FULFILLED`, `PENDING_REMOTE`, `REJECTED_REMOTE`, `EXPIRED_REMOTE`, `CANCELLED_REMOTE`, `REQUIRES_MANUAL_REVIEW`, `REMOTE_STATUS_UNAVAILABLE`, `SKIPPED`, `IGNORED_REMOTE`, `UNKNOWN_REMOTE`.

---

## 9. Metadata usada

En `Payment.metadata` (sin migración):

| Campo | Uso |
|-------|-----|
| `reconciliationStatus` | `REQUIRES_MANUAL_REVIEW` \| `AUTO_OK` \| `RESOLVED` |
| `reconciliationReason` | p. ej. `ORDER_EXPIRED_PAYMENT_APPROVED` |
| `reconciliationSource` | `GETNET_POLL`, `GETNET_WEBHOOK`, `GETNET_SCRIPT` |
| `reconciliationUpdatedAt` | ISO timestamp |
| `reconciliationAlertSentAt` / `reconciliationAlertReason` | Dedup alertas |
| `lastReconciliationOutcome` / `lastReconciliationAt` | Última corrida |
| `getnetWebhookEvents` | (Slice B) eventos webhook |

**No se guardan** PAN, CVV ni payload PCI completo.

---

## 10. Script de reconciliación

```bash
# Dry-run (default) — no muta DB
pnpm --filter api run payments:reconcile-getnet

pnpm --filter api run payments:reconcile-getnet -- --dry-run --limit 10

# Mutar DB
pnpm --filter api run payments:reconcile-getnet -- --confirm --limit 10 --older-than-minutes 10

# Un pago
pnpm --filter api run payments:reconcile-getnet -- --payment-id <paymentId> --confirm

# Tenant
pnpm --filter api run payments:reconcile-getnet -- --tenant-id tenant-demo --confirm
```

Producción con `--confirm`: además `GETNET_RECONCILE_CONFIRM_PROD=yes`.

---

## 11. Alertas operativas

`OperationalAlertsEmailService` para:

* Orden expirada + aprobado remoto
* Orden ya pagada por otro payment
* Pago no encontrado (webhook)
* Estado remoto desconocido
* Error fetch Getnet (reconciliación)

Dedup vía `reconciliationAlertSentAt` + `reconciliationAlertReason`.

---

## 12. Casos fuera de alcance

* Facturación automática
* Reembolsos automáticos
* Reversa de tickets
* Service fee / comisión por método de pago Getnet
* ~~UI admin de reconciliación~~ — [GETNET_ADMIN_PAYMENTS.md](./GETNET_ADMIN_PAYMENTS.md) (Slice E)
* Activación prod — [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md)
* Política final post-expiración (reemitir vs devolución manual)

---

## Archivos

| Archivo | Rol |
|---------|-----|
| `getnet-reconciliation.service.ts` | Servicio principal |
| `getnet-reconciliation.policy.util.ts` | Reglas puras |
| `getnet-reconciliation.metadata.util.ts` | Metadata helpers |
| `scripts/payments-reconcile-getnet.ts` | CLI batch |

---

## 13. Smoke tests

```bash
pnpm --filter api run test:getnet-reconciliation
pnpm --filter api run test:getnet-webhook
pnpm --filter api run test:order-fulfillment
pnpm --filter api run build
```

Manual con API + DB: `smoke:user-portal` (demo) + webhook curl en [GETNET_WEBHOOK.md](./GETNET_WEBHOOK.md).
