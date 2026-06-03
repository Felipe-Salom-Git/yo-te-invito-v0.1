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

Ver `apps/api/.env.example`. **Prioridad:** `GETNET_WEBCHECKOUT_*` → fallback `GETNET_GLOBAL_*`.

Producción validada (`api.globalgetnet.com`):

| Variable | Uso |
|----------|-----|
| `GETNET_*_ENV` | `pre`, `sandbox`, `production` |
| `GETNET_*_AUTH_BASE_URL` | `POST .../authentication/oauth2/access_token` |
| `GETNET_*_WEBCHECKOUT_BASE_URL` | ej. `https://api.globalgetnet.com/dpy/web-checkout/v1` |
| `GETNET_*_PAYMENT_INTENT_PATH` | `/payment-intent` |
| `GETNET_*_SELLER_ID` | Requerido — header `x-seller-id` |
| `GETNET_*_CLIENT_ID` / `SECRET_KEY` | Requeridos — **body** OAuth (no Basic Auth) |
| `GETNET_*_MERCHANT_ID` | Opcional — `x-merchant-id` solo si definido |
| `GETNET_WEBHOOK_*` | Webhook portal (Basic o header) |
| `WEB_APP_URL` | Return URLs YTI en metadata (`/checkout/return`) |

**No commitear** scripts locales `test-getnet.js` con credenciales (ver `.gitignore`).

**No mezclar** con `GETNET_CLIENT_ID` / `GETNET_CLIENT_SECRET` (legacy Checkout API v2).

---

## 5. OAuth (contrato real)

`POST` auth URL con `Content-Type: application/x-www-form-urlencoded`:

```txt
grant_type=client_credentials
client_id=<CLIENT_ID>
client_secret=<SECRET_KEY>
```

Respuesta: `access_token`, `token_type: Bearer`, `expires_in`. No loguear el token completo.

---

## 6. Payload payment-intent

`POST ${WEBCHECKOUT_BASE_URL}${PAYMENT_INTENT_PATH}` — ej. `https://api.globalgetnet.com/dpy/web-checkout/v1/payment-intent`

Headers: `Authorization: Bearer`, `x-seller-id` (requerido), `x-merchant-id` solo si configurado.

Cuerpo (contrato funcional producción):

- `order_id` — id orden YTI
- `payment`: `{ currency: 'ARS', amount }` — centavos
- `product[]`: `product_type: physical_goods`, título/descripción/valor/cantidad
- `customer`: email, nombre, `document_type: DNI`, `document_number` (fallback `yti-{orderId}` si falta `buyerDocument` en checkout)

**V1 Redirect:** no iframe/lightbox; usar `redirect_url` de la respuesta. URLs de retorno del portal YTI: alias en [GETNET_PORTAL_URL_COMPATIBILITY.md](./GETNET_PORTAL_URL_COMPATIBILITY.md).

El ejemplo externo usaba iframe; Yo Te Invito redirige al comprador con `window.location.href = redirectUrl`.

---

## 7. Metadata guardada

En `Payment.metadata`:

| Campo | Descripción |
|-------|-------------|
| `getnetIntegration` | `webcheckout` |
| `webCheckoutEnv` | `pre` / `production` |
| `paymentIntentId` | ID Getnet |
| `redirectUrl` | URL de pago |
| `getnetOrderId` | `order.id` |
| `returnUrl` / `errorUrl` | URLs YTI internas |

`Payment.externalReference` = `paymentIntentId`  
`Payment.paymentUrl` = `redirectUrl` → API devuelve `checkoutUrl` / `redirectUrl` al frontend.

---

## 8. Webhook

- Ruta: `POST /public/payments/getnet/webhook`
- Auth: `GETNET_WEBHOOK_AUTH_MODE=basic` (portal) o header legacy
- Lookup: `externalReference`, `paymentIntentId` en metadata, aliases webhook
- Reconciliación → fulfill sin reescribir emisión de tickets

---

## 9. Return flow

`/checkout/return` sin cambios de contrato: poll `refresh-status` + `CheckoutPaymentStatusView`.

**Portal URLs fijas:** alias en web — ver [GETNET_PORTAL_URL_COMPATIBILITY.md](./GETNET_PORTAL_URL_COMPATIBILITY.md) (`/checkout/success`, `/checkout/error`, `/api/getnet/callback` → return + API webhook).

Web Checkout: poll remoto **no implementado** (pendiente GET payment-intent status); confiar en webhook o refresh con override manual.

---

## 10. Smoke

```bash
pnpm --filter api run smoke:getnet-webcheckout -- --config
pnpm --filter api run smoke:getnet-webcheckout -- --auth
pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --dry-run
GETNET_WEBCHECKOUT_CONFIRM_PRE=yes pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --confirm
GETNET_WEBCHECKOUT_CONFIRM_PROD=yes pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --confirm --amount 50000
```

POST producción exige `GETNET_WEBCHECKOUT_CONFIRM_PROD=yes` explícito.

El script **no imprime** `redirect_url` completo ni tokens; en éxito muestra `redirect_url: received`, `redirect_host` y `redirect_path` enmascarado (`scripts/smoke-getnet-webcheckout-output.util.ts`).

### Smoke productivo payment-intent (validado 2026-06)

Comando (solo con autorización explícita):

```bash
GETNET_WEBCHECKOUT_CONFIRM_PROD=yes pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --confirm --amount 50000
```

| Resultado | Estado |
|-----------|--------|
| Auth producción (`api.globalgetnet.com`) | OK |
| Payment intent producción | OK |
| Monto usado | `50000` centavos / $500,00 ARS |
| `payment_intent_id` | Recibido (se loguea en smoke) |
| `redirect_url` | Recibido; salida sanitizada (no URL completa) |
| Pago confirmado / capturado | **No** — este smoke solo crea intent |
| Próximo paso | Flujo app local: checkout Yo Te Invito → redirect comprador → return + webhook |

## VPS Redirect Smoke

Estado (deploy controlado `feat/v1-s03-api-foundation` en VPS):

| Check | Estado |
|-------|--------|
| Deploy controlado VPS | OK |
| Smokes config / auth / dry-run (VPS) | OK |
| Aliases portal (`/checkout/success`, `/checkout/error`, `/api/getnet/callback`) | OK |
| Redirección a Getnet hosted checkout desde app (`yoteinvito.club`) | OK |
| Pago real | No ejecutado |
| Webhook Portal Getnet (Basic Auth registrado) | **Pendiente** |

Detalle: [GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md](./GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md).

---

## 11. Código

| Archivo | Rol |
|---------|-----|
| `providers/getnet/webcheckout/getnet-webcheckout.config.ts` | Env + presets PRE/prod |
| `providers/getnet/webcheckout/getnet-webcheckout-auth.service.ts` | OAuth |
| `providers/getnet/webcheckout/getnet-webcheckout-client.service.ts` | payment-intent |
| `public-payments.service.ts` | Orquestación + metadata |
| `getnet-webhook.service.ts` | Basic auth + lookup intent |
| `scripts/smoke-getnet-webcheckout.ts` | Smoke config/auth/intent |
| `scripts/smoke-getnet-webcheckout-output.util.ts` | Sanitización logs smoke |

---

## 12. Pendientes

- Campo DNI obligatorio en checkout UI si Getnet rechaza fallback `yti-{orderId}`

- GET payment-intent status para poll en `/checkout/return`
- iFrame / Lightbox V2
- Service fee, facturación, reembolsos
- Emisión manual de tickets

---

## Referencias

- [GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md](./GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md)
- [GETNET_PORTAL_URL_COMPATIBILITY.md](./GETNET_PORTAL_URL_COMPATIBILITY.md)
- [GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md](./GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md)
- [NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md](../context/NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md)
- [GETNET_CHECKOUT_RETURN_FLOW.md](./GETNET_CHECKOUT_RETURN_FLOW.md)
- [GETNET_WEBHOOK.md](./GETNET_WEBHOOK.md)
- [GETNET_RECONCILIATION.md](./GETNET_RECONCILIATION.md)
- [ORDER_FULFILLMENT_SERVICE.md](./ORDER_FULFILLMENT_SERVICE.md)
