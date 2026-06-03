# Getnet Closing Audit — Yo Te Invito

**Fecha cierre bloque:** 2026-06-01  
**Alcance:** pagos reales Getnet sin facturación, service fee, reembolsos ni emisión manual de tickets.

---

## 1. Alcance cerrado

- Checkout Getnet + demo coexistiendo.
- Fulfillment idempotente de órdenes pagadas.
- Webhook Getnet con secret/header y metadata sanitizada.
- Reconciliación (poll, webhook, script batch, admin manual).
- UI comprador post-pago (`/checkout/return`).
- Admin operativo (`/admin/pagos`).
- Documentación de activación y smoke productivo.
- Script `smoke:getnet` (config / webhook simulado).

---

## 2. Slices completados

### Slice A — Fulfill unificado

`OrderFulfillmentService.fulfillPaidOrder()` — único camino para `PAID`, `APPROVED`, tickets, comisión referral, email legacy.

### Slice B — Webhook Getnet

`POST /public/payments/getnet/webhook` — ver [GETNET_WEBHOOK.md](./GETNET_WEBHOOK.md).

### Slice C — Reconciliación

`GetnetReconciliationService` + `payments:reconcile-getnet` — ver [GETNET_RECONCILIATION.md](./GETNET_RECONCILIATION.md).

### Slice D — Return flow comprador

`/checkout/return` — ver [GETNET_CHECKOUT_RETURN_FLOW.md](./GETNET_CHECKOUT_RETURN_FLOW.md).

### Slice E — Admin pagos

`/admin/pagos` — ver [GETNET_ADMIN_PAYMENTS.md](./GETNET_ADMIN_PAYMENTS.md).

### Slice F — Activación/smoke

[GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md), [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md), `smoke:getnet`.

### Slice G — Cierre documental + release

Este documento, test reconciliación corregido (`now` en policy para tests), commit/push, deploy VPS (procedimiento).

### Slice Web Checkout Redirect — `feat/v1-s03-api-foundation` (2026-06-01)

Integración limpia **Web Checkout Redirect** (Global API `payment-intent`), commit `5a5c794`.

- **Rama:** `feat/v1-s03-api-foundation` — **no** mergeado a `main` al cierre de este doc.
- **Rama `development`:** descartada y eliminada; spikes **no** incorporados al código productivo.
- **Camino activo en dev:** `GETNET_WEBCHECKOUT_*` → `redirect_url`; fallback `GETNET_CLIENT_*` (GeoPagos v2).
- **Docs:** [GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md](./GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md), [GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md](./GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md), [NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md](../context/NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md).
- **Smoke:** `pnpm --filter api run smoke:getnet-webcheckout`.

---

## 3. Archivos principales

| Área | Archivos |
|------|----------|
| Fulfillment | `order-fulfillment.service.ts`, `order-fulfillment.util.ts` |
| Webhook | `getnet-webhook.service.ts`, `getnet-webhook.util.ts`, `public-payments-getnet-webhook.controller.ts` |
| Reconciliación | `getnet-reconciliation.service.ts`, `getnet-reconciliation.policy.util.ts` |
| Checkout status | `checkout-payment-status.service.ts`, `checkout-payment-status.util.ts` |
| Return URLs | `getnet-return-url.util.ts` |
| Admin | `admin-payments.service.ts`, `admin-payments.controller.ts` |
| Web UI | `checkout/return`, `admin/pagos`, `CheckoutPaymentStatusView.tsx` |
| Shared | `checkout-payment-status.ts`, `getnet-webhook.ts`, `admin-payments.ts` |
| Scripts | `smoke-getnet.ts`, `payments-reconcile-getnet.ts`, `test:*-getnet*` |
| Web Checkout Redirect | `providers/getnet/webcheckout/*`, `smoke-getnet-webcheckout.ts` |

---

## 4. Endpoints agregados

| Método | Ruta |
|--------|------|
| POST | `/public/payments/getnet/webhook` |
| GET | `/public/orders/:orderId/checkout-status` |
| POST | `/public/payments/:paymentId/refresh-status` |
| GET | `/admin/payments` |
| GET | `/admin/payments/:paymentId` |
| POST | `/admin/payments/:paymentId/reconcile` |
| POST | `/admin/payments/:paymentId/mark-reviewed` |

Legacy (sin eliminar): `GET /public/orders/:orderId/payment-status`, `GET /public/payments/:id/status`, `POST /public/payments/:id/demo-confirm`.

---

## 5. Rutas frontend agregadas

| Ruta | Uso |
|------|-----|
| `/checkout/return` | Estado post-Getnet + polling |
| `/admin/pagos` | Listado operativo |
| `/admin/pagos/[paymentId]` | Detalle + acciones |

---

## 6. Scripts agregados

| Script | Comando |
|--------|---------|
| Smoke Getnet | `pnpm --filter api run smoke:getnet` |
| Smoke Web Checkout Redirect | `pnpm --filter api run smoke:getnet-webcheckout` |
| Reconcile batch | `pnpm --filter api run payments:reconcile-getnet` |
| Tests util | `test:getnet-webhook`, `test:getnet-reconciliation`, `test:order-fulfillment` |
| Auth probe | `test:getnet-auth` |

---

## 7. Migraciones

| Migración | Contenido |
|-----------|-----------|
| `20260601140000_audit_payment_actions` | `PAYMENT_ADMIN_RECONCILED`, `PAYMENT_MANUAL_REVIEWED` en `AuditAction` |

Aplicar en cada entorno: `cd apps/api && npx prisma migrate deploy`.

---

## 8. Variables de entorno requeridas

Tabla completa: [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md) §2.

Mínimas prod: `GETNET_ENV`, `GETNET_CLIENT_ID`, `GETNET_CLIENT_SECRET`, `GETNET_WEBHOOK_SECRET`, `WEB_APP_URL`, `GETNET_RECONCILE_CONFIRM_PROD=yes`.

---

## 9. Smokes y builds ejecutados (Slice G local)

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @yo-te-invito/shared build` | OK |
| `pnpm --filter api run build` | OK |
| `pnpm --filter web run build` | OK |
| `test:getnet-webhook` | OK |
| `test:getnet-reconciliation` | OK (fix: `now` opcional en policy; no era bug productivo) |
| `test:order-fulfillment` | OK |
| `smoke:getnet --config` | FAIL local esperado: `GETNET_WEBHOOK_SECRET`, `WEB_APP_URL`, API `/health` no levantada |
| `payments:reconcile-getnet --dry-run` | Debe correr sin credenciales Getnet (REMOTE_STATUS_UNAVAILABLE por pago si aplica remoto) |

**Hotfix 2026-06-01:** script reconcile — `GetnetReconcileScriptModule`, `reflect-metadata`, `@Inject(PrismaService)`; dry-run sin credenciales OK.

---

## 10. Pendientes explícitos fuera de alcance

- Facturación automática
- Service fee / comisión al comprador
- Reembolsos automáticos
- Emisión manual de tickets desde admin
- Firma oficial Getnet (hoy shared secret)
- Restricción de medios de pago por operación
- Casos sin Payment local en webhook
- Go-live real con monto mínimo (requiere ejecución manual en VPS — §12)
- Emails dedicados por estado pendiente/rechazado (solo confirmación en aprobado)

---

## 11. Checklist para deploy VPS

Ver [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md) §5 y §3.

Resumen:

1. `git pull origin main`
2. `pnpm install --frozen-lockfile`
3. `cd apps/api && npx prisma migrate deploy && npx prisma generate`
4. Configurar `.env` Getnet (sin commitear)
5. `pnpm build` (shared + api + web)
6. `systemctl restart yti-api yti-web yti-scanner`
7. `curl https://api.yoteinvito.club/health`
8. `pnpm --filter api run smoke:getnet -- --config --api-base https://api.yoteinvito.club`

---

## 12. Checklist para prueba real con monto mínimo

Solo con autorización del cliente y credenciales prod/sandbox:

1. Evento de prueba — importe mínimo.
2. Checkout Getnet → pasarela → pago autorizado.
3. `/checkout/return` → aprobado + tickets.
4. `/me/tickets`, email, `/admin/pagos`.
5. Reenvío webhook → sin tickets duplicados.

Detalle: [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md) Caso 1.  
Registrar resultado en sección «Ejecución real» de ese doc cuando se ejecute.

---

## 13. Rollback seguro

1. No borrar pagos ni órdenes.
2. Operativamente: no ofrecer Getnet en UI; mantener demo.
3. Revisar `/admin/pagos` y reconciliación dry-run.
4. Si fallo grave de app: rollback git al commit anterior estable (runbook DonWeb).
5. **No** `db:reset`, **no** cleanup, **no** revertir migraciones aplicadas.

---

## 14. Estado final del bloque

**Código:** listo para activación controlada en VPS.  
**Release commit:** `26eb70e` (`feat: prepare getnet payments production activation`) en `main`.  
**Deploy VPS:** pendiente de ejecución manual (SSH desde máquina con clave `yoteinvito`).  
**Go-live cobro real:** pendiente de checklist VPS + prueba monto mínimo autorizada.  
**Documentación índice:** [GETNET_PAYMENTS_AUDIT.md](./GETNET_PAYMENTS_AUDIT.md).

**Próximo paso operativo:** prueba real controlada con cliente (Getnet monto mínimo + ticket + admin + webhook).
