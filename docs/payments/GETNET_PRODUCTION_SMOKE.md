# Getnet Production Smoke — Yo Te Invito

Guía paso a paso para validar pagos Getnet antes y después del go-live.  
Checklist de activación: [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md).

> **Rama activa:** `feat/v1-s03-api-foundation` con **Web Checkout Redirect** (`5a5c794`). `main` puede seguir en flujo legacy GeoPagos hasta merge explícito. **No** usar `development`.

**Regla:** no ejecutar cobros reales sin checklist completa y autorización del negocio.

---

## Comandos previos (todos los entornos)

```bash
pnpm --filter @yo-te-invito/shared build
pnpm --filter api run build
pnpm --filter web run build
pnpm --filter api run smoke:getnet -- --config
pnpm --filter api run smoke:getnet-webcheckout -- --config
pnpm --filter api run payments:reconcile-getnet -- --dry-run --limit 10

> Debe completar sin TypeError aunque falten credenciales Getnet; pagos con consulta remota pendiente reportan `REMOTE_STATUS_UNAVAILABLE`.
```

Opcional OAuth:

```bash
pnpm --filter api run test:getnet-auth
pnpm --filter api run smoke:getnet -- --config --check-auth
```

Tests unitarios helpers:

```bash
pnpm --filter api run test:getnet-webhook
pnpm --filter api run test:getnet-reconciliation
pnpm --filter api run test:order-fulfillment
```

---

## Caso 1 — Pago aprobado (happy path)

### Preparación

1. Evento de prueba publicado con ticketing habilitado y ticket de **bajo importe**.
2. API con `GETNET_ENV` y credenciales del ambiente acordado.
3. `WEB_APP_URL` = dominio público (ej. `https://yoteinvito.club`).

### Pasos

1. Navegador incógnito o usuario de prueba → `/events/{eventId}`.
2. Checkout → completar datos → crear orden.
3. **Pagar con Getnet** (no demo).
4. Completar pago en pasarela Getnet (medio autorizado por el cliente).
5. Redirección a `/checkout/return?orderId=…&paymentId=…`.

### Verificar

| Capa | Qué revisar |
|------|-------------|
| UI return | Fase `approved`, CTA “Ver mis tickets” (o login) |
| BD | `Payment.status = APPROVED`, `Order.status = PAID` |
| Tickets | `ticket.count` > 0 para la orden |
| Email | Confirmación legacy enviada (si SMTP configurado) |
| Comprador | `/me/tickets` lista entradas |
| Admin | `/admin/pagos` — provider GETNET, sin “requiere revisión” |
| Scanner | (Opcional) validar QR de un ticket emitido |

### Si el return queda pendiente

1. Esperar polling en `/checkout/return` (~1 min).
2. Botón **Actualizar estado**.
3. Verificar webhook en logs: `journalctl -u yti-api -f | grep -i getnet`
4. `pnpm --filter api run payments:reconcile-getnet -- --payment-id <id> --dry-run` luego `--confirm` si corresponde.

---

## Caso 2 — Pago pendiente

### Cómo generarlo

- Completar checkout Getnet pero **no** finalizar pago; o
- Usar medio/escenario que Getnet deje en `PENDING` (según documentación del ambiente).

### Verificar

1. `/checkout/return` muestra **pendiente** y nota “no vuelvas a pagar…”.
2. Polling cada ~5 s (máx. ~1 min) sin errores en consola.
3. **Sin tickets** en BD para esa orden.
4. Tras aprobación remota (webhook o reconcile): pasa a aprobado y emite tickets **una vez**.

---

## Caso 3 — Pago rechazado / cancelado

### Rechazado

1. Forzar rechazo en pasarela (tarjeta de prueba rechazada, según Getnet).
2. `/checkout/return` → fase `rejected`.
3. CTA **Intentar nuevamente** → vuelve al checkout del evento.
4. Sin tickets.

### Cancelado

1. Cancelar en pasarela o volver con `cancelled=1` en URL.
2. Fase `cancelled` + **Volver al checkout**.
3. Sin tickets.

### Demo (regresión)

1. Mismo evento → **Pagar (demo)** en dev/staging.
2. Confirmar éxito inline o `/checkout/success` con demo.
3. Tickets emitidos; `provider = DEMO`.

---

## Caso 4 — Webhook duplicado

**Requisito:** pago Getnet con `externalReference` y `GETNET_WEBHOOK_SECRET` configurado.

```bash
# Primera vez
pnpm --filter api run smoke:getnet -- --simulate-webhook \
  --payment-id <paymentId> --status APPROVED --event-id smoke-dup-001

# Segunda vez (mismo event-id)
pnpm --filter api run smoke:getnet -- --simulate-webhook \
  --payment-id <paymentId> --status APPROVED --event-id smoke-dup-001
```

### Verificar

- Segunda respuesta: `outcome: duplicate` (o fulfill `alreadyFulfilled`).
- Conteo de tickets **sin incremento**.
- `Payment.metadata.getnetWebhookEvents` tiene 2 entradas (o idempotencia en `processedWebhookEventIds`).
- Email confirmación no duplicado si `orderConfirmationEmailSent` ya está (fulfill idempotente).

Producción: `SMOKE_GETNET_CONFIRM_PROD=yes`.

---

## Caso 5 — Orden expirada + pago aprobado

**Solo staging / QA** — no forzar en prod sin control.

1. Crear orden `PENDING_PAYMENT`.
2. Esperar expiración del job de órdenes o ajustar `expiresAt` en BD (solo dev).
3. Simular webhook APPROVED con `externalReference` del pago Getnet:

```bash
pnpm --filter api run smoke:getnet -- --simulate-webhook \
  --payment-id <id> --status APPROVED --event-id expired-approved-test
```

### Verificar

- **No** tickets nuevos.
- `metadata.reconciliationStatus = REQUIRES_MANUAL_REVIEW`
- `reconciliationReason` incluye `ORDER_EXPIRED_PAYMENT_APPROVED`
- Alerta operativa (email admin si configurado).
- `/checkout/return` → fase `manual_review`
- `/admin/pagos` → badge revisión; **Marcar como revisado** con nota (no emite tickets).

---

## QA rutas frontend (referencia rápida)

| Ruta | Cómo revisar sin pago real |
|------|---------------------------|
| `/checkout/return` aprobado | Tras demo o smoke webhook en orden vigente |
| `/checkout/return` pendiente | Orden con `Payment.PENDING` |
| `/checkout/return` rechazado | `Payment.REJECTED` |
| `/checkout/return` cancelado | `Payment.CANCELLED` o `?cancelled=1` |
| `/checkout/return` expirado | `Order.EXPIRED` |
| `/checkout/return` manual_review | Caso 5 |
| `/me/orders/[orderId]` | Orden de prueba autenticada |
| `/admin/pagos` | Login admin |
| `/admin/pagos/[paymentId]` | ID desde listado |

No hay fixtures automáticos de UI en V1; usar datos de smoke o staging.

---

## Smoke admin (resumen)

1. `/admin/pagos` — filtros GETNET + revisión manual.
2. Detalle — timeline webhook, metadata operativa.
3. **Reconciliar** — ver outcome en pantalla.
4. **Marcar revisado** — solo si `REQUIRES_MANUAL_REVIEW`.
5. `/admin/auditoria` — acciones `PAYMENT_ADMIN_RECONCILED`, `PAYMENT_MANUAL_REVIEWED`.

---

## Logs útiles (VPS)

```bash
journalctl -u yti-api -f
# Buscar: Getnet, webhook, reconciliation, REQUIRES_MANUAL_REVIEW
```

---

## Qué falta para go-live definitivo

- [ ] Credenciales **producción** validadas (`test:getnet-auth` / `smoke:getnet --check-auth`)
- [ ] Webhook URL pública alcanzable desde Getnet
- [ ] Return/cancel URLs confirmadas con proveedor
- [ ] Firma oficial webhook (si Getnet la exige)
- [ ] Política de medios de pago acordada
- [ ] Runbook de soporte (revisión manual, contacto comprador)
- [ ] Caso 1 ejecutado al menos una vez en prod con monto mínimo autorizado

Ver también §13 de [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md).

---

## Ejecución real (VPS / prod)

Registrar aquí cada prueba autorizada (no rellenar hasta ejecutar):

| Fecha | Entorno | Evento/orden | Resultado | Operador | Notas |
|-------|---------|--------------|-----------|----------|-------|
| | | | | | |

Índice de cierre del bloque: [GETNET_CLOSING_AUDIT.md](./GETNET_CLOSING_AUDIT.md).
