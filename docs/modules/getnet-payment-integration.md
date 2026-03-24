# Getnet Checkout Integration

Integración de Getnet Checkout para pagos reales en Yo Te Invito.

## Summary / Resumen

- **Provider**: Getnet (GeoPagos/Santander)
- **Flow**: Backend creates payment intent → returns checkout URL → frontend redirects user → user pays at Getnet → returns to success page → backend syncs status
- **Demo mode**: Unchanged; use `DEMO` provider or `PAYMENT_PROVIDER_DEFAULT=DEMO`

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GETNET_AUTH_BASE_URL` | No | OAuth server. Default preprod: `https://auth.preprod.geopagos.com` |
| `GETNET_CHECKOUT_BASE_URL` | No | Checkout API. Default preprod: `https://api-santander.preprod.geopagos.com` |
| `GETNET_CLIENT_ID` | Yes (for Getnet) | OAuth client ID |
| `GETNET_CLIENT_SECRET` | Yes (for Getnet) | OAuth client secret |
| `NEXT_PUBLIC_PAYMENT_PROVIDER_DEFAULT` | No | Frontend default: `DEMO` or `GETNET` |

**Production URLs:**
- Auth: `https://auth.geopagos.com`
- Checkout: `https://api.globalgetnet.com.ar`

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
