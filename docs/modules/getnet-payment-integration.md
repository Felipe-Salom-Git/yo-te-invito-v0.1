# Getnet Checkout Integration

Integración de Getnet Checkout para pagos reales en Yo Te Invito.

## Summary / Resumen

- **Provider**: Getnet (GeoPagos/Santander)
- **Flow**: Backend creates payment intent → returns checkout URL → frontend redirects user → user pays at Getnet → returns to `/checkout/return` → `POST refresh-status` / webhook / poll reconciles
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
| `WEB_APP_URL` / `APP_URL` | No | Base URL for `Payment.metadata.returnUrl` / `cancelUrl` (see [GETNET_CHECKOUT_RETURN_FLOW.md](../payments/GETNET_CHECKOUT_RETURN_FLOW.md)) |

**URLs oficiales** ([Ambientes Getnet](https://developers-sdk-documentation-site-santander.preprod.geopagos.com/page/environments)):

| Ambiente | Auth | Checkout |
|----------|------|----------|
| Staging | `https://auth.stg.geopagos.io` | `https://api-mpos-santander.stg.geopagos.io` |
| Production | `https://auth.prd.geopagos.io` | `https://api.globalgetnet.com.ar` |

No usar hosts `*.preprod.geopagos.com` / `api-santander.preprod.geopagos.com` — responden **404**.

## Getnet Web Checkout Redirect (`GETNET_WEBCHECKOUT_*`)

When `GETNET_WEBCHECKOUT_CLIENT_ID`, `SECRET_KEY`, and `SELLER_ID` are set, **Web Checkout Redirect** takes precedence over legacy Checkout API v2.

See [GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md](../payments/GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md).

| Variable | Description |
|----------|-------------|
| `GETNET_WEBCHECKOUT_ENV` | `pre` (default), `sandbox`, `production` |
| `GETNET_WEBCHECKOUT_*` | Auth + payment-intent on `api.pre` / `api.globalgetnet.com` |
| `GETNET_WEBHOOK_AUTH_MODE` | `basic` for portal webhook user/password |

Legacy `GETNET_CLIENT_*` remains as fallback when Web Checkout env is not configured.

## GETNET_WEB_CHECKOUT_* (legacy note)

Previously documented as unused. Superseded by `GETNET_WEBCHECKOUT_*` (see above).

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
- `apps/api/src/modules/public-payments/checkout-payment-status.service.ts`
- `apps/api/src/modules/public-payments/getnet-return-url.util.ts`

## API Endpoints

- `POST /public/orders/:orderId/payments` — create payment (provider: DEMO | GETNET)
- `GET /public/orders/:orderId/checkout-status` — **read-only** buyer status (Slice D)
- `POST /public/payments/:paymentId/refresh-status` — sync Getnet + checkout status response
- `GET /public/orders/:orderId/payment-status` — legacy refresh (poll)
- `GET /public/payments/:paymentId/status` — legacy refresh by payment ID
- `POST /public/payments/getnet/webhook` — Getnet async notifications (see [GETNET_WEBHOOK.md](../payments/GETNET_WEBHOOK.md))

## Webhook env (Slice B)

| Variable | Description |
|----------|-------------|
| `GETNET_WEBHOOK_SECRET` | Shared secret in header |
| `GETNET_WEBHOOK_HEADER_NAME` | Default `x-getnet-webhook-secret` |
| `GETNET_WEBHOOK_REQUIRE_SECRET` | Force secret check (`true` / auto in production) |

## Return URLs (Getnet)

Al crear un pago Getnet, la API guarda en `Payment.metadata`:

- `returnUrl`: `{WEB_APP_URL}/checkout/return?orderId=&paymentId=&tenantId=&provider=getnet`
- `cancelUrl`: mismo path con `cancelled=1`

Detalle: [GETNET_CHECKOUT_RETURN_FLOW.md](../payments/GETNET_CHECKOUT_RETURN_FLOW.md).

Si el dashboard de Getnet permite URLs fijas, apuntar al mismo patrón. El frontend no confía en query `status`.

## Checkout UI

En el paso de pago se muestran dos botones:
- **Pagar (demo)** — Simula el pago sin pasarela (emite tickets al instante).
- **Probar Getnet** — Crea la orden en Getnet y redirige al checkout real (preprod). Requiere credenciales configuradas en el backend.

## Production Hardening (done)

- Retry logic: token y order creation con `maxRetries: 2` y delay configurable.

## Remaining for Production

- Confirm official Getnet webhook signature scheme (today: shared secret header)
- ~~Admin UI for manual review queue~~ — Slice E: `/admin/pagos` ([GETNET_ADMIN_PAYMENTS.md](../payments/GETNET_ADMIN_PAYMENTS.md))
- Refunds (if not yet supported)

Reconciliation batch: `pnpm --filter api run payments:reconcile-getnet` — see [GETNET_RECONCILIATION.md](../payments/GETNET_RECONCILIATION.md).

## Block closure

[GETNET_CLOSING_AUDIT.md](../payments/GETNET_CLOSING_AUDIT.md) — índice slices A–G, endpoints, migraciones, pendientes.

## Activation & production smoke (Slice F)

| Doc / command | Purpose |
|---------------|---------|
| [GETNET_ACTIVATION_CHECKLIST.md](../payments/GETNET_ACTIVATION_CHECKLIST.md) | Pre-go-live checklist |
| [GETNET_PRODUCTION_SMOKE.md](../payments/GETNET_PRODUCTION_SMOKE.md) | Manual smoke scenarios |
| `pnpm --filter api run smoke:getnet -- --config` | Env + health (no secrets printed) |
| `pnpm --filter api run smoke:getnet -- --simulate-webhook --payment-id <id>` | QA webhook (staging; prod needs `SMOKE_GETNET_CONFIRM_PROD=yes`) |
