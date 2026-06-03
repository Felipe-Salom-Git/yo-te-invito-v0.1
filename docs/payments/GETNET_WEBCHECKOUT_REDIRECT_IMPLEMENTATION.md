# Getnet Web Checkout Redirect Implementation

**Branch:** `feat/v1-s03-api-foundation`  
**Commit:** `5a5c794` — `feat(getnet): integrate webcheckout redirect payment intent`  
**Cierre documental:** [GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md](./GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md) · [Handoff](../context/NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md)

> **Ramas:** desarrollo en `feat/v1-s03-api-foundation`. `main` sin cambios por este slice. Rama `development` **descartada y eliminada** — no usar spikes ni commits de esa rama.

**V1 decision:** Redirect only — no iFrame, no Lightbox, no WooCommerce.

---

## 1. Decisión

Yo Te Invito V1 integra **Getnet Web Checkout Redirect**:

1. Backend crea `payment-intent` en `api.pre` / producción.
2. Getnet responde `payment_intent_id` + `redirect_url`.
3. Frontend redirige al comprador con `window.location.href = redirectUrl`.
4. Retorno en `/checkout/return` + webhook/reconciliación confirman el pago.
5. `OrderFulfillmentService.fulfillPaidOrder()` emite tickets (único punto de emisión).

---

## 2. Motivo

| Redirect | iFrame / Lightbox (V2) |
|----------|-------------------------|
| Menor riesgo frontend | Requiere SDK, CSP, postMessage |
| Mejor en mobile | Más superficie PCI/UI |
| Encaja con `/checkout/return` existente | Más complejidad de integración |
| Reutiliza webhook + reconciliación A–G | Mismo backend, distinto embed |

---

## 3. Flujo

```txt
POST /public/orders/:orderId/payments { provider: GETNET }
  → Payment PENDING (local)
  → POST .../dpy/web-checkout/v1/payment-intent
  → metadata: paymentIntentId, redirectUrl, getnetIntegration=webcheckout
  → response: checkoutUrl / redirectUrl

Comprador → redirect_url (Getnet hosted)
Getnet → success_url / error_url → /checkout/return
Webhook Basic Auth → GetnetReconciliationService → fulfillPaidOrder
```

**Fallback:** si `GETNET_WEBCHECKOUT_*` no está configurado, sigue el flujo legacy GeoPagos `GETNET_CLIENT_*` → `POST /api/v2/orders`.

---

## 4. Variables de entorno

Ver `apps/api/.env.example`.

| Variable | Uso |
|----------|-----|
| `GETNET_WEBCHECKOUT_ENV` | `pre` (default), `sandbox`, `production` |
| `GETNET_WEBCHECKOUT_AUTH_BASE_URL` | OAuth token |
| `GETNET_WEBCHECKOUT_API_BASE_URL` | Host API |
| `GETNET_WEBCHECKOUT_PAYMENT_INTENT_PATH` | `/dpy/web-checkout/v1/payment-intent` |
| `GETNET_WEBCHECKOUT_MERCHANT_ID` | Header `x-merchant-id` |
| `GETNET_WEBCHECKOUT_SELLER_ID` | Header `x-seller-id` (requerido) |
| `GETNET_WEBCHECKOUT_CLIENT_ID` | OAuth Basic user |
| `GETNET_WEBCHECKOUT_SECRET_KEY` | OAuth Basic password |
| `GETNET_WEBHOOK_AUTH_MODE` | `basic` o `header` |
| `GETNET_WEBHOOK_BASIC_USER` / `PASSWORD` | Portal Web Checkout |
| `WEB_APP_URL` | `success_url` / `error_url` |

**No mezclar** con `GETNET_CLIENT_ID` / `GETNET_CLIENT_SECRET` (legacy Checkout API v2).

---

## 5. Payload payment-intent

Implementado en `GetnetWebCheckoutClientService`:

- `mode: instant`
- `order_id` = id orden YTI
- `configurations`: 3DS, `success_url`, `error_url`
- `payment`: `{ currency, amount }` — **enteros**, centavos en últimos 2 dígitos
- `product[]`: `product_type: service`, título del ticket
- `expires_at: 15m`

---

## 6. Metadata guardada

En `Payment.metadata`:

| Campo | Descripción |
|-------|-------------|
| `getnetIntegration` | `webcheckout` |
| `webCheckoutEnv` | `pre` / `production` |
| `paymentIntentId` | ID Getnet |
| `redirectUrl` | URL de pago |
| `getnetOrderId` | `order.id` |
| `returnUrl` / `errorUrl` | URLs YTI |
| `webCheckoutResponse` | Respuesta sanitizada |

`Payment.externalReference` = `paymentIntentId`  
`Payment.paymentUrl` = `redirectUrl`

---

## 7. Webhook

- Ruta: `POST /public/payments/getnet/webhook`
- Auth: `GETNET_WEBHOOK_AUTH_MODE=basic` (portal) o header legacy
- Lookup: `externalReference`, `paymentIntentId` en metadata, aliases webhook
- Reconciliación → fulfill sin reescribir emisión de tickets

---

## 8. Return flow

`/checkout/return` sin cambios de contrato: poll `refresh-status` + `CheckoutPaymentStatusView`.

Web Checkout: poll remoto **no implementado** (pendiente GET payment-intent status); confiar en webhook o refresh con override manual.

---

## 9. Smoke

```bash
pnpm --filter api run smoke:getnet-webcheckout -- --config
pnpm --filter api run smoke:getnet-webcheckout -- --auth
pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --dry-run
GETNET_WEBCHECKOUT_CONFIRM_PRE=yes pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --confirm --amount 100
```

---

## 10. Código

| Archivo | Rol |
|---------|-----|
| `providers/getnet/webcheckout/getnet-webcheckout.config.ts` | Env + presets PRE/prod |
| `providers/getnet/webcheckout/getnet-webcheckout-auth.service.ts` | OAuth |
| `providers/getnet/webcheckout/getnet-webcheckout-client.service.ts` | payment-intent |
| `public-payments.service.ts` | Orquestación + metadata |
| `getnet-webhook.service.ts` | Basic auth + lookup intent |

---

## 11. Pendientes

- GET payment-intent status para poll en `/checkout/return`
- iFrame / Lightbox V2
- Service fee, facturación, reembolsos
- Emisión manual de tickets

---

## Referencias

- [GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md](./GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md)
- [NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md](../context/NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md)
- [GETNET_CHECKOUT_RETURN_FLOW.md](./GETNET_CHECKOUT_RETURN_FLOW.md)
- [GETNET_WEBHOOK.md](./GETNET_WEBHOOK.md)
- [GETNET_RECONCILIATION.md](./GETNET_RECONCILIATION.md)
- [ORDER_FULFILLMENT_SERVICE.md](./ORDER_FULFILLMENT_SERVICE.md)
