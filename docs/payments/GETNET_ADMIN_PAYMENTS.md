# Getnet Admin Payments — Yo Te Invito

## 1. Objetivo

Vista administrativa mínima para operar pagos Getnet y la cola de **revisión manual** (orden expirada + pago aprobado, pagos duplicados, conflictos de reconciliación), sin reembolsos automáticos ni emisión manual de tickets en V1.

## 2. Pantalla admin

| Ruta | Uso |
|------|-----|
| `/admin/pagos` | Listado con filtros, badges, reconciliar rápido |
| `/admin/pagos/[paymentId]` | Detalle operativo, webhook timeline, acciones |

Navegación: sidebar admin → **Pagos**.

## 3. Endpoints backend

| Método | Ruta | Rol |
|--------|------|-----|
| `GET` | `/admin/payments` | `ADMIN` |
| `GET` | `/admin/payments/:paymentId` | `ADMIN` |
| `POST` | `/admin/payments/:paymentId/reconcile` | `ADMIN` |
| `POST` | `/admin/payments/:paymentId/mark-reviewed` | `ADMIN` |

Contratos: `packages/shared/src/schemas/admin-payments.ts`.

## 4. Filtros disponibles

- `provider` — DEMO | GETNET | MERCADOPAGO
- `status` — estado local del pago
- `requiresManualReview` — `metadata.reconciliationStatus === REQUIRES_MANUAL_REVIEW`
- `reconciliationStatus` — valor exacto en metadata
- `q` — paymentId, orderId, externalReference, externalPaymentId, email comprador
- `createdFrom` / `createdTo`
- `page` / `pageSize`

## 5. Revisión manual

Se marca en reconciliación (Slice C) cuando, por ejemplo:

- `ORDER_EXPIRED_PAYMENT_APPROVED`
- `ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT`

El listado muestra badge **Requiere revisión** y el detalle incluye copy operativo.

## 6. Reconciliación manual

`POST …/reconcile` llama:

```ts
GetnetReconciliationService.reconcilePayment(paymentId, {
  source: 'ADMIN_MANUAL',
  tenantId,
});
```

Solo pagos **GETNET**. Registra auditoría `PAYMENT_ADMIN_RECONCILED`.

## 7. Qué significa marcar como revisado

`POST …/mark-reviewed` con `{ note?: string }` actualiza metadata:

- `reconciliationStatus: MANUAL_REVIEWED`
- `reconciliationReviewedAt`, `reconciliationReviewedByUserId`, `reconciliationReviewedNote`

Auditoría: `PAYMENT_MANUAL_REVIEWED`.

**No** implica reembolso, emisión de tickets ni cambio financiero automático.

## 8. Qué NO hace esta pantalla

- No reembolsa
- No emite tickets manualmente
- No factura
- No cambia comisiones
- No garantiza resolución financiera ante Getnet

## 9. Casos operativos frecuentes

### Orden expirada + Getnet aprobado

Reconciliar puede mantener `REQUIRES_MANUAL_REVIEW` sin tickets. Revisar stock y contactar comprador; luego **Marcar como revisado** con nota.

### Pago duplicado por orden

`reconciliationReason: ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT`. Validar qué pago fulfilló la orden.

### Webhook sin payment local

Fuera de esta UI (buscar en logs / referencia en Getnet dashboard).

### Estado remoto desconocido

Reconciliar desde detalle; ver `lastReconciliationOutcome` en metadata.

## 10. Smoke test manual

1. Admin → `/admin/pagos`
2. Filtrar GETNET + requiere revisión
3. Abrir detalle → ver webhook events
4. Reconciliar → ver outcome
5. Marcar revisado con nota → badge actualizado, sin tickets nuevos

## Smoke y activación

- [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md)
- [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md)
- `pnpm --filter api run smoke:getnet -- --config`

## Próximo slice

**Getnet Slice G** — Cierre documental del bloque pagos reales.
