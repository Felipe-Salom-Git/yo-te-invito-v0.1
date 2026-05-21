# Getnet Checkout Integration

Integración de Getnet Checkout para pagos reales en Yo Te Invito.

## Summary / Resumen

- **Provider**: Getnet (GeoPagos/Santander)
- **Flow**: Backend creates payment intent → returns checkout URL → frontend redirects user → user pays at Getnet → returns to success page → backend syncs status
- **Demo mode**: Unchanged; use `DEMO` provider or `PAYMENT_PROVIDER_DEFAULT=DEMO`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GETNET_ENV` | No | `staging` (default) or `production` — elige URLs oficiales si no definís base URLs |
| `GETNET_AUTH_BASE_URL` | No | OAuth server (override). Staging default: `https://auth.stg.geopagos.io` |
| `GETNET_CHECKOUT_BASE_URL` | No | Checkout API (override). Staging: `https://api-mpos-santander.stg.geopagos.io` |
| `GETNET_CLIENT_ID` | Yes (for Getnet) | OAuth client ID |
| `GETNET_CLIENT_SECRET` | Yes (for Getnet) | OAuth client secret |
| `GETNET_SCOPE` | No | `*` (default) o `api_orders_post` |

**Probar credenciales:** `pnpm --filter api run test:getnet-auth` (debe responder `OK: token obtenido`). Si devuelve **401**, las claves no son válidas para ese ambiente — pedir nuevas a Getnet/Santander (`support@santander.com.ar`).
| `NEXT_PUBLIC_PAYMENT_PROVIDER_DEFAULT` | No | Frontend default: `DEMO` or `GETNET` |

**URLs oficiales** ([Ambientes Getnet](https://developers-sdk-documentation-site-santander.preprod.geopagos.com/page/environments)):

| Ambiente | Auth | Checkout |
|----------|------|----------|
| Staging | `https://auth.stg.geopagos.io` | `https://api-mpos-santander.stg.geopagos.io` |
| Production | `https://auth.prd.geopagos.io` | `https://api.globalgetnet.com.ar` |

No usar hosts `*.preprod.geopagos.com` / `api-santander.preprod.geopagos.com` — responden **404**.

## GETNET_WEB_CHECKOUT_* Credentials

**Not used** in this integration. The standard checkout-link flow uses only `GETNET_CLIENT_ID` and `GETNET_CLIENT_SECRET` with `client_credentials` OAuth. If Getnet provides separate web-checkout credentials in the future, they can be wired via these env vars; for now they are not required.

## DB Fields Used

- `Payment.externalReference` → Getnet order UUID
- `Payment.paymentUrl` → Getnet checkout URL
- `Payment.metadata` → optional raw API response
- No migration required; existing schema supports these.

## Remote → Local Status Mapping

| Getnet status | Local PaymentStatus |
|---------------|---------------------|
| SUCCESS, APPROVED | APPROVED |
| PENDING | PENDING |
| FAILED, REJECTED | REJECTED |
| EXPIRED | CANCELLED |
| other | PENDING |

## Backend Files

- `apps/api/src/modules/public-payments/providers/getnet/getnet.config.ts`
- `apps/api/src/modules/public-payments/providers/getnet/getnet-auth.service.ts`
- `apps/api/src/modules/public-payments/providers/getnet/getnet-checkout.service.ts`
- `apps/api/src/modules/public-payments/providers/getnet/getnet.mapper.ts`
- `apps/api/src/modules/public-payments/providers/getnet/getnet.module.ts`
- `apps/api/src/modules/public-payments/public-payments.service.ts` (extended)
- `apps/api/src/modules/public-payments/public-payments-refresh.controller.ts`

## API Endpoints

- `POST /public/orders/:orderId/payments` — create payment (provider: DEMO | GETNET)
- `GET /public/orders/:orderId/payment-status` — refresh and return status (for success page)
- `GET /public/payments/:paymentId/status` — refresh by payment ID

## Return URLs (Getnet)

Configure success/failure URLs in the Getnet dashboard so users return to:
- Success: `{APP_URL}/checkout/success?orderIds={order_id}` (if Getnet supports dynamic placeholders)
- Or a static success URL; document how orderId is passed back if different.

## Checkout UI

En el paso de pago se muestran dos botones:
- **Pagar (demo)** — Simula el pago sin pasarela (emite tickets al instante).
- **Probar Getnet** — Crea la orden en Getnet y redirige al checkout real (preprod). Requiere credenciales configuradas en el backend.

## Production Hardening (done)

- Retry logic: token y order creation con `maxRetries: 2` y delay configurable.

## Remaining for Production

- Webhooks (if Getnet supports them) for real-time status updates
- Reconciliation jobs (periodic status sync)
- Refunds (if not yet supported)
