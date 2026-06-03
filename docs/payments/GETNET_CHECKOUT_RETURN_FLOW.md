# Getnet Checkout Return Flow — Yo Te Invito

## 1. Objetivo

Cerrar la experiencia del comprador después de pagar con Getnet (o volver del checkout): pantalla de estado clara, URLs de retorno alineadas entre API y web, consulta read-only al backend y refresh controlado vía reconciliación (Slice C).

## 2. Rutas frontend

| Ruta | Uso |
|------|-----|
| `/checkout/return` | Retorno principal desde Getnet (y consulta manual de estado) |
| `/checkout/[eventId]` | Checkout por evento; `?tenantId=&orderId=` |
| `/checkout/success` | Demo carrito invitado si `orderIds`; si no, alias → `/checkout/return` (portal Getnet) |
| `/checkout/error` | Alias portal → `/checkout/return?cancelled=1` |
| `/me/orders/[orderId]` | Detalle autenticado con enlace a `/checkout/return` |

Query params en retorno (no son fuente de verdad del estado):

```txt
/checkout/return?orderId=&paymentId=&tenantId=&provider=getnet&cancelled=1
```

`cancelled=1` es solo una pista visual; el backend calcula `displayPhase` desde orden/pago/metadata.

## 3. Endpoints backend

| Método | Ruta | Comportamiento |
|--------|------|----------------|
| `GET` | `/public/orders/:orderId/checkout-status` | **Read-only** — snapshot para UI |
| `POST` | `/public/payments/:paymentId/refresh-status` | Sync Getnet + `GetnetReconciliationService` → respuesta checkout-status |
| `GET` | `/public/payments/:paymentId/status` | Legacy refresh (sin contrato checkout) |
| `GET` | `/public/orders/:orderId/payment-status` | Legacy — delega refresh del último pago |

Contrato compartido: `CheckoutPaymentStatusResponse` en `packages/shared/src/schemas/checkout-payment-status.ts`.

## 4. Fuente de verdad del estado

1. Webhook Getnet (`POST /public/payments/getnet/webhook`)
2. Reconciliación / polling (`GetnetReconciliationService`)
3. `OrderFulfillmentService` al aprobar

El frontend **no** confía en `status` del query string. Usa `GET checkout-status` y, si hace falta, `POST refresh-status`.

## 5. Polling frontend

En `/checkout/return`, si `displayPhase === pending` y `paymentProvider === GETNET`:

- Intervalo: **5 s**
- Máximo: **12** ticks (~1 min)
- Cada tick: `POST refresh-status` (reconciliación remota)
- Botón **Actualizar estado** dispara el mismo refresh manual

DEMO no llama a Getnet; el botón hace `refetch` del GET read-only.

## 6. Estados visuales

`displayPhase`: `approved` | `pending` | `rejected` | `cancelled` | `expired` | `manual_review`

Componente: `apps/web/components/checkout/CheckoutPaymentStatusView.tsx`

## 7. CTA por estado

| Fase | Mensaje / CTA |
|------|----------------|
| `approved` | Ver tickets (o login si invitado) |
| `pending` | Actualizar estado + nota “no vuelvas a pagar” |
| `rejected` | Intentar nuevamente → checkout del evento |
| `cancelled` | Volver al checkout |
| `expired` | Volver a comprar |
| `manual_review` | Contactar soporte + no volver a pagar |

Flags del API: `canViewTickets`, `canRetryPayment`, `canContactSupport`.

## 8. Compatibilidad con demo

- `POST /public/payments/:id/demo-confirm` sin cambios
- Checkout por evento: paso `done` inline tras demo
- `/checkout/success`: usa `getCheckoutPaymentStatus` (sin refresh Getnet automático)

## 9. Variables de entorno

| Variable | Uso |
|----------|-----|
| `WEB_APP_URL` | Base para `returnUrl` / `cancelUrl` en metadata del pago (prioridad) |
| `APP_URL` | Fallback |
| `NEXT_PUBLIC_APP_URL` | Fallback (también en web) |
| `NEXT_PUBLIC_API_BASE_URL` | Cliente web → API |

En dev: `http://localhost:3000` + API local. En prod: dominio real (`https://yoteinvito.club`).

Return URLs se guardan en `Payment.metadata.returnUrl` / `cancelUrl` al crear pago Getnet.

## 10. Fuera de alcance

- Facturación automática
- Service fee / comisión al comprador
- Reembolsos
- Reversa de tickets
- UI admin de reconciliación

## Smoke manual sugerido

Ver checklist al final del prompt Slice D (demo, pending, approved, rejected, cancelled, manual review).

## Próximo slice

**Getnet Slice G** — Cierre documental del bloque pagos reales (sin facturación).  
Smoke/activación: [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md), [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md).
