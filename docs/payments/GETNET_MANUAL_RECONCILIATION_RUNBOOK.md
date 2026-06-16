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

## 2. Mecanismo recomendado

Script:

```bash
pnpm --filter api run reconcile:getnet-approved -- --paymentId <id> --dry-run
```

Flujo:

```txt
Validación local (GETNET + webcheckout + paymentIntentId + PENDING)
→ metadata manualReconciliation (live)
→ GetnetReconciliationService.reconcilePayment(remoteStatusOverride)
→ OrderFulfillmentService (si aplica)
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

Por cada pago:

```bash
pnpm --filter api run reconcile:getnet-approved -- \
  --paymentId cmqfvq3he000g4xc0momiekpo \
  --dry-run
```

Opcional (simula estado remoto explícito):

```bash
REMOTE_STATUS=Authorized \
  pnpm --filter api run reconcile:getnet-approved -- \
  --paymentId cmqfvq3he000g4xc0momiekpo \
  --dry-run
```

**Resultado esperado dry-run:**

- `outcome: FULFILLED` o `ALREADY_FULFILLED` si la orden ya tiene tickets.
- `dryRun: true`
- `message: would_fulfill` si procedería a emitir tickets.

Repetir para los otros dos `paymentId`.

---

## 6. Reconciliación real (propuesta — no ejecutar sin autorización)

Variables requeridas:

| Variable | Requerida | Ejemplo |
|----------|-----------|---------|
| `CONFIRM_APPROVED_GETNET_RECONCILE` | **Sí** | `yes` |
| `REMOTE_STATUS` | **Sí** | `Authorized` o `APPROVED` |
| `REMOTE_PAYMENT_ID` | Recomendada | UUID del pago en Getnet |
| `REMOTE_AUTHORIZATION_CODE` | Opcional | código autorización portal |
| `REMOTE_CHECKOUT_ID` | Opcional | checkout id portal |

Comando propuesto (ejemplo pago 1):

```bash
CONFIRM_APPROVED_GETNET_RECONCILE=yes \
REMOTE_STATUS=Authorized \
REMOTE_PAYMENT_ID=<uuid-from-portal> \
pnpm --filter api run reconcile:getnet-approved -- \
  --paymentId cmqfvq3he000g4xc0momiekpo \
  --confirm
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
- `manualReconciliation.remoteStatus`: `AUTHORIZED` / `APPROVED`
- `manualReconciliation.paymentIntentId`: coincide con portal
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
| Orden expirada con pago aprobado | `REQUIRES_MANUAL_REVIEW` — alerta operativa |

---

## 9. Riesgos

1. **Falso positivo:** reconciliar sin confirmar en portal → cobro no real pero tickets emitidos. Mitigar: evidencia portal obligatoria.
2. **Orden expirada:** pago aprobado tardío → revisión manual (`ORDER_EXPIRED_PAYMENT_APPROVED`).
3. **Doble pago:** otra orden ya `PAID` → `ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT`.
4. **Entorno incorrecto:** `DATABASE_URL` local vs prod.

---

## 10. Relación con otros mecanismos

| Mecanismo | Web Checkout aprobado sin webhook |
|-----------|-----------------------------------|
| Webhook `ed0cc3e` | Futuros `Authorized` automáticos |
| `POST /admin/payments/:id/reconcile` | **No** — sin override |
| `payments:reconcile-getnet` | **No** — sin poll WC |
| `reconcile:getnet-approved` | **Sí** — con evidencia portal |

---

## Referencias

- [GETNET_WEBHOOK.md](./GETNET_WEBHOOK.md)
- [GETNET_WEBHOOK_PERIOD_CHANGE_AUDIT.md](../audits/GETNET_WEBHOOK_PERIOD_CHANGE_AUDIT.md)
- Script: `apps/api/scripts/reconcile-approved-getnet-webcheckout-payment.ts`
