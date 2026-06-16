# Getnet — Reconciliación manual Web Checkout aprobados

**Rama:** `feat/v1-s03-api-foundation`  
**Caso:** pagos **aprobados/autorizados en portal Getnet** que quedaron `Payment.status = PENDING` en Yo Te Invito porque el webhook falló por schema (`status` raíz requerido vs `payment.result.status`) antes de `ed0cc3e`.

---

## 1. ¿Alcanza el endpoint admin?

```http
POST /admin/payments/:paymentId/reconcile
```

**No para Web Checkout Redirect en este escenario.**

Motivo en código (`GetnetReconciliationService.reconcilePayment`):

- Pagos con `metadata.getnetIntegration = webcheckout` **no tienen poll remoto** implementado.
- Sin `remoteStatusOverride`, el servicio devuelve `REMOTE_STATUS_UNAVAILABLE`.
- El endpoint admin **no acepta** estado remoto ni evidencia del portal — solo llama reconciliación sin override.

El script batch existente `payments:reconcile-getnet` tiene la misma limitación para Web Checkout sin override.

---

## 2. Mecanismos disponibles

### 2.1 `reconcile:getnet-approved` — órdenes `PENDING_PAYMENT` vigentes

Script legacy para pagos aprobados en portal con orden aún en `PENDING_PAYMENT` (no expirada).

```bash
pnpm --filter api run reconcile:getnet-approved -- --paymentId <id> --dry-run
```

### 2.2 `payments:reconcile-getnet-approved-manual` — órdenes `EXPIRED` (caso actual)

**Usar este script** para los 3 pagos afectados: `Payment PENDING` + `Order EXPIRED` + 0 tickets.

El script valida precondiciones, escribe `metadata.manualReconciliation`, invoca `GetnetReconciliationService` con `forceExpiredApprovedFulfillment` y `OrderFulfillmentService` con `allowExpiredRecovery` (venta directa en batch tras liberar reserva al expirar).

```bash
pnpm --filter api run payments:reconcile-getnet-approved-manual -- \
  --payment-id <paymentId> \
  --remote-payment-id <uuid-portal> \
  --dry-run
```

Flujo:

```txt
Validación local (GETNET + webcheckout + PENDING + order EXPIRED|PENDING_PAYMENT + sin tickets)
→ metadata manualReconciliation (live)
→ GetnetReconciliationService.reconcilePayment(APPROVED + forceExpiredApprovedFulfillment)
→ OrderFulfillmentService (allowExpiredRecovery)
→ Payment APPROVED / Order PAID / tickets
```

**No** hace `UPDATE` SQL directo ni emite tickets fuera de `OrderFulfillmentService`.

---

## 3. Pagos afectados (referencia operativa)

| Payment local | Order | paymentIntentId |
|---------------|-------|-----------------|
| `cmqfvq3he000g4xc0momiekpo` | `cmqfvq0zw000c4xc0tpbs1qjg` | `4e0060d6-db64-43b8-a233-b20393f87c64` |
| `cmpxtuix7001d40xb4xk2net3` | `cmpxtuh3y001940xbqom4b7xn` | `4eda2db5-5606-4f84-9fb5-8584d58ecead` |
| `cmpxsxjhx000t40xb2m3c04mz` | `cmpxsxf44000p40xbc6r458ck` | `27985504-01e5-42b5-8421-218d209d1893` |

Confirmar en portal Getnet que cada `paymentIntentId` figura **Authorized/Approved** antes de reconciliar.

---

## 4. Pre-requisitos

- API con fix webhook `ed0cc3e` desplegado (para futuros webhooks).
- `DATABASE_URL` apuntando al entorno correcto (VPS prod).
- Evidencia en portal Getnet para el pago (captura / export; no commitear).
- **No** ejecutar sin dry-run previo.

---

## 5. Dry-run (sin mutar DB)

Por cada pago (orden `EXPIRED`):

```bash
pnpm --filter api run payments:reconcile-getnet-approved-manual -- \
  --payment-id cmqfvq3he000g4xc0momiekpo \
  --remote-payment-id <uuid-from-portal> \
  --dry-run
```

Repetir para los otros dos `payment-id` (el `remote-payment-id` puede ser placeholder en dry-run si solo se valida estado local; en live es obligatorio).

**Resultado esperado dry-run:**

- Snapshot: payment, order, items, tickets `0/N`
- `abort conditions` vacío
- `outcome: FULFILLED`, `dryRun: true`
- `message: would_fulfill_expired_recovery`

Si `reconcile:getnet-approved` se usa por error en orden `EXPIRED`, dry-run devuelve `REQUIRES_MANUAL_REVIEW` / `ORDER_EXPIRED_PAYMENT_APPROVED` **sin** emitir tickets.

---

## 6. Reconciliación real (propuesta — no ejecutar sin autorización)

Variables requeridas:

| Variable | Requerida | Ejemplo |
|----------|-----------|---------|
| `CONFIRM_GETNET_APPROVED_MANUAL` | **Sí** | `yes` |

Argumentos CLI:

| Flag | Requerida (live) | Descripción |
|------|------------------|-------------|
| `--payment-id` | **Sí** | ID local del Payment |
| `--remote-payment-id` | **Sí** | UUID del pago en portal Getnet |
| `--remote-checkout-id` | Opcional | checkout id portal |
| `--authorization-code` | Opcional | código autorización portal |

Comando propuesto — pago 1:

```bash
CONFIRM_GETNET_APPROVED_MANUAL=yes \
pnpm --filter api run payments:reconcile-getnet-approved-manual -- \
  --payment-id cmqfvq3he000g4xc0momiekpo \
  --remote-payment-id <uuid-from-portal>
```

Pago 2:

```bash
CONFIRM_GETNET_APPROVED_MANUAL=yes \
pnpm --filter api run payments:reconcile-getnet-approved-manual -- \
  --payment-id cmpxtuix7001d40xb4xk2net3 \
  --remote-payment-id <uuid-from-portal>
```

Pago 3:

```bash
CONFIRM_GETNET_APPROVED_MANUAL=yes \
pnpm --filter api run payments:reconcile-getnet-approved-manual -- \
  --payment-id cmpxsxjhx000t40xb2m3c04mz \
  --remote-payment-id <uuid-from-portal>
```

**Un pago por ejecución.** Verificar post-check antes del siguiente.

---

## 7. Verificación post-reconciliación

### DB / admin

```sql
-- Payment APPROVED
SELECT id, status, "orderId", "externalPaymentId", metadata->>'paymentIntentId'
FROM "Payment" WHERE id = '<paymentId>';

-- Order PAID
SELECT id, status FROM "Order" WHERE id = '<orderId>';

-- Tickets emitidos
SELECT COUNT(*) FROM "Ticket" WHERE "orderId" = '<orderId>' AND source = 'ORDER';
```

### Metadata esperada

- `manualReconciliation.source`: `GETNET_PORTAL_MANUAL_CONFIRMATION`
- `manualReconciliation.remoteStatus`: `APPROVED`
- `manualReconciliation.paymentIntentId`: coincide con portal
- `manualReconciliation.remotePaymentId`: UUID portal
- `lastReconciliationOutcome`: `FULFILLED` o `ALREADY_FULFILLED`
- `reconciliationSource`: `GETNET_PORTAL_MANUAL_CONFIRMATION`

### UI

- Orden en portal usuario: estado pagado.
- Tickets visibles en `/me/tickets`.
- Email confirmación (si cola SMTP activa).

---

## 8. Idempotencia

| Caso | Comportamiento |
|------|----------------|
| Payment ya `APPROVED` + Order `PAID` + tickets completos | Script sale OK sin duplicar |
| Payment `APPROVED` pero sin tickets | Reconcile puede `FULFILL` o `ALREADY_FULFILLED` |
| Re-ejecutar tras `FULFILLED` | `OrderFulfillmentService` → `alreadyFulfilled` |
| Orden expirada + pago aprobado portal | `payments:reconcile-getnet-approved-manual` con `forceExpiredApprovedFulfillment` |
| `reconcile:getnet-approved` en orden EXPIRED | `REQUIRES_MANUAL_REVIEW` — no emite tickets |

---

## 9. Riesgos

1. **Falso positivo:** reconciliar sin confirmar en portal → cobro no real pero tickets emitidos. Mitigar: evidencia portal + `--remote-payment-id` obligatorio en live.
2. **Orden expirada:** reserva de batch liberada — fulfillment usa venta directa; validar cupo batch antes de live.
3. **Stock insuficiente:** si el batch se agotó tras expiración → `INSUFFICIENT_BATCH_STOCK` en live.
4. **Doble pago:** otra orden ya `PAID` → `ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT`.
5. **Entorno incorrecto:** `DATABASE_URL` local vs prod.

---

## 10. Relación con otros mecanismos

| Mecanismo | Web Checkout aprobado sin webhook |
|-----------|-----------------------------------|
| Webhook `ed0cc3e` | Futuros `Authorized` automáticos |
| `POST /admin/payments/:id/reconcile` | **No** — sin override |
| `payments:reconcile-getnet` | **No** — sin poll WC |
| `reconcile:getnet-approved` | Parcial — solo si orden no `EXPIRED` |
| `payments:reconcile-getnet-approved-manual` | **Sí** — `EXPIRED` + evidencia portal |

---

## Referencias

- [GETNET_WEBHOOK.md](./GETNET_WEBHOOK.md)
- [GETNET_WEBHOOK_PERIOD_CHANGE_AUDIT.md](../audits/GETNET_WEBHOOK_PERIOD_CHANGE_AUDIT.md)
- Script EXPIRED: `apps/api/scripts/reconcile-getnet-approved-manual.ts`
- Script legacy: `apps/api/scripts/reconcile-approved-getnet-webcheckout-payment.ts`
