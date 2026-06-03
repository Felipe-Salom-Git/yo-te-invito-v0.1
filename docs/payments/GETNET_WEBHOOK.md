# Getnet Webhook — Yo Te Invito

**Slice B** (2026-06-01) — notificaciones asíncronas Getnet sobre el fulfill unificado (Slice A).

---

## 1. Objetivo

Recibir notificaciones de pago de Getnet, validarlas, registrarlas en `Payment.metadata`, actualizar `Payment.status` y — si el pago está aprobado — invocar `OrderFulfillmentService.fulfillPaidOrder({ source: 'GETNET_WEBHOOK' })`.

El **polling** (`GET /public/payments/:id/status`) sigue activo como respaldo.

---

## 2. Endpoint

| Método | Path |
|--------|------|
| `POST` | `/public/payments/getnet/webhook` |

**Controller:** `PublicPaymentsGetnetWebhookController`  
**Service:** `GetnetWebhookService.handleWebhook`

Respuesta HTTP **200** en procesamiento normal (incluye duplicados idempotentes).  
**401** si falla validación de secret.

---

## 3. Seguridad / validación

| Variable | Requerida | Default | Descripción |
|----------|-----------|---------|-------------|
| `GETNET_WEBHOOK_SECRET` | Sí en prod / Getnet habilitado | — | Token compartido |
| `GETNET_WEBHOOK_HEADER_NAME` | No | `x-getnet-webhook-secret` | Header a comparar |
| `GETNET_WEBHOOK_REQUIRE_SECRET` | No | auto (`true` en `NODE_ENV=production` o si hay credenciales Getnet) | Forzar secret |

Comparación con `timingSafeEqual`.  
Cuando Getnet publique firma oficial (HMAC), ajustar `GetnetWebhookService.assertWebhookAuthorized` — hoy es **secret en header**.

**No commitear** secretos reales.

---

## 4. Payload esperado

Schema Zod flexible (`packages/shared/src/schemas/getnet-webhook.ts`):

```json
{
  "eventId": "evt_…",
  "externalPaymentId": "uuid-getnet-order",
  "status": "APPROVED"
}
```

Alias aceptados:

- `externalPaymentId` | `externalReference` | `uuid` | `orderId` (referencia externa)
- `eventId` | `id`
- `status` | `paymentStatus`
- `tenantId` (opcional, acota búsqueda)

**No enviar** datos de tarjeta (PAN, CVV). El servicio sanitiza keys conocidas antes de hashear.

---

## 5. Mapping de estados

Helper: `mapGetnetWebhookStatusToLocal` (reutiliza `mapGetnetStatusToLocal` donde aplica).

| Remoto | `Payment.status` | Fulfill |
|--------|------------------|---------|
| `SUCCESS`, `APPROVED` | `APPROVED` | Sí |
| `PENDING`, `IN_PROGRESS`, `PROCESSING` | `PENDING` | No |
| `FAILED`, `REJECTED` | `REJECTED` | No |
| `EXPIRED` | `CANCELLED` | No |
| `CANCELLED`, `CANCELED` | `CANCELLED` | No |
| `REFUNDED`, `CHARGEBACK` | — | Ignorado (sin reversa de tickets) |
| Desconocido | — | `unknown_status`, no rompe |

**Reglas:**

- No degradar `Payment` de `APPROVED` a `REJECTED`/`CANCELLED`.
- No degradar orden `PAID`.

---

## 6. Idempotencia

1. Clave: `eventId` → `evt:{id}`; si no hay evento → hash de `externalPaymentId` + `remoteStatus` + `payloadHash`.
2. Lista `Payment.metadata.processedWebhookEventIds`.
3. Duplicado → `{ ok: true, outcome: 'duplicate' }` sin re-fulfill.
4. Fulfill repetido delega en Slice A (`alreadyFulfilled`).

---

## 7. Relación con OrderFulfillmentService y reconciliación

El webhook delega en **`GetnetReconciliationService.reconcilePayment`** (Slice C), que aplica política V1 y solo entonces llama a `fulfillPaidOrder` si corresponde.

* Orden vigente + `APPROVED` → fulfill.
* Orden `EXPIRED` + `APPROVED` → **sin tickets**, `REQUIRES_MANUAL_REVIEW` — ver [GETNET_RECONCILIATION.md](./GETNET_RECONCILIATION.md).

Polling usa el mismo servicio de reconciliación.

---

## 8. Eventos registrados

En `Payment.metadata` (sin migración Prisma):

```ts
{
  processedWebhookEventIds: string[],
  getnetWebhookEvents: [{
    receivedAt,
    eventId?,
    externalPaymentId?,
    remoteStatus,
    source: 'GETNET_WEBHOOK',
    processedOutcome,
    payloadHash,      // SHA-256 del body sanitizado
    idempotencyKey
  }]
}
```

Últimos **30** eventos / **100** ids de idempotencia (arrays recortados).

**No se guarda** payload completo ni datos PCI.

---

## 9. Casos críticos

### Payment local no encontrado

- Respuesta: `{ ok: false, outcome: 'payment_not_found' }`
- Alerta: `OperationalAlertsEmailService.enqueueCriticalAlert`

### Orden expirada con pago aprobado

- Se llama fulfill con `rejectIfExpired: false` (puede `skipped`)
- Alerta **critical** a operaciones
- Política final: **Slice C**

### Webhook duplicado

- `outcome: 'duplicate'`, HTTP 200

### Estado remoto desconocido

- `outcome: 'unknown_status'`, evento registrado, sin fulfill

---

## 10. Fuera de alcance

- Facturación automática
- Service fee / comisión al comprador por método de pago
- Reembolsos y reversa de tickets
- Política final orden `EXPIRED` + cobro aprobado (Slice C)
- Tabla `PaymentWebhookEvent` (evaluar si el volumen lo exige)

---

## 11. Smoke tests

### Unit

```bash
pnpm --filter api run test:getnet-webhook
```

### Manual (API local, sin secret en dev)

```bash
curl -X POST "http://localhost:3001/public/payments/getnet/webhook" \
  -H "Content-Type: application/json" \
  -d '{"eventId":"evt_test","externalPaymentId":"REPLACE_UUID","status":"APPROVED"}'
```

Con secret:

```bash
curl -X POST "$API_URL/public/payments/getnet/webhook" \
  -H "Content-Type: application/json" \
  -H "x-getnet-webhook-secret: $GETNET_WEBHOOK_SECRET" \
  -d '{"eventId":"evt_001","externalPaymentId":"GETNET_ORDER_UUID","status":"APPROVED"}'
```

Flujo demo + portal: `pnpm --filter api run smoke:user-portal`

---

## Archivos

| Archivo | Rol |
|---------|-----|
| `getnet-webhook.service.ts` | Procesamiento |
| `public-payments-getnet-webhook.controller.ts` | HTTP |
| `providers/getnet/getnet-webhook.util.ts` | Mapping, idempotencia, metadata |
| `providers/getnet/getnet-webhook.config.ts` | Env |

## QA / activación

- [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md) §9
- [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md) — Caso 4 (duplicado)

```bash
pnpm --filter api run smoke:getnet -- --simulate-webhook --payment-id <id> --status APPROVED --event-id <unique>
```
