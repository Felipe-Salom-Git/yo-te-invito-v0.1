# Next Chat Handoff — Getnet Web Checkout Redirect

**Última actualización:** 2026-06-01  
**Leer primero** si el chat continúa integración o pruebas Getnet.

---

## 1. Resumen corto

Estamos integrando **Getnet Web Checkout Redirect** para Yo Te Invito: backend crea `payment-intent`, Getnet devuelve `redirect_url`, el frontend redirige al comprador, el retorno pasa por `/checkout/return`, y el webhook + reconciliación existentes emiten tickets.

---

## 2. Rama actual

```txt
feat/v1-s03-api-foundation
```

**No usar** `development` (eliminada). **No tocar** `main` salvo instrucción explícita.

---

## 3. No usar

| Descartado | Motivo |
|------------|--------|
| Rama `development` | Solo spikes; eliminada local y remoto |
| Cherry-pick / merge desde `development` | Contamina el repo |
| `GETNET_GLOBAL_API_SANDBOX_SPIKE.md` y scripts `spike:*` | Exploratorio; no en código productivo |
| WooCommerce / VTEX | Descartados como integración final |
| iFrame / Lightbox | Fuera de V1 |
| `GETNET_CLIENT_*` como camino principal | Solo fallback si `GETNET_WEBCHECKOUT_*` no está configurado |

---

## 4. Último commit técnico

```txt
5a5c794 — feat(getnet): integrate webcheckout redirect payment intent
```

Push: `origin/feat/v1-s03-api-foundation`

Cierre documental (este handoff): commit posterior `docs(getnet): close webcheckout redirect handoff`.

---

## 5. Qué está implementado

- Cliente: `apps/api/src/modules/public-payments/providers/getnet/webcheckout/`
- OAuth + `POST .../payment-intent` (payload Redirect: `mode: instant`, `success_url`, `error_url`, productos `service`)
- `PublicPaymentsService`: prioridad Web Checkout si `GETNET_WEBCHECKOUT_*` configurado
- `Payment.metadata`: `getnetIntegration: webcheckout`, `paymentIntentId`, `redirectUrl`
- Respuesta API: `checkoutUrl` + `redirectUrl` (frontend ya usa `checkoutUrl`)
- Webhook: `GETNET_WEBHOOK_AUTH_MODE=basic` + lookup por `payment_intent_id`
- `OrderFulfillmentService` / reconciliación: **sin reescribir**
- Smoke: `pnpm --filter api run smoke:getnet-webcheckout`
- Docs: [GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md](../payments/GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md), [GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md](../payments/GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md)

---

## 6. Qué falta probar

### Local / PRE

1. Configurar `apps/api/.env` local (no commitear):

```env
GETNET_WEBCHECKOUT_ENV=pre
GETNET_WEBCHECKOUT_AUTH_BASE_URL=https://api.pre.globalgetnet.com/authentication/oauth2/access_token
GETNET_WEBCHECKOUT_API_BASE_URL=https://api.pre.globalgetnet.com
GETNET_WEBCHECKOUT_PAYMENT_INTENT_PATH=/dpy/web-checkout/v1/payment-intent
GETNET_WEBCHECKOUT_MERCHANT_ID=...
GETNET_WEBCHECKOUT_SELLER_ID=...
GETNET_WEBCHECKOUT_CLIENT_ID=...
GETNET_WEBCHECKOUT_SECRET_KEY=...
GETNET_WEBHOOK_AUTH_MODE=basic
GETNET_WEBHOOK_BASIC_USER=...
GETNET_WEBHOOK_BASIC_PASSWORD=...
WEB_APP_URL=http://localhost:3000
GETNET_WEBCHECKOUT_CONFIRM_PRE=yes
```

2. Ejecutar:

```bash
pnpm --filter api run smoke:getnet-webcheckout -- --config
pnpm --filter api run smoke:getnet-webcheckout -- --auth
pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --dry-run
```

3. Si `--auth` → HTTP 200:

```bash
GETNET_WEBCHECKOUT_CONFIRM_PRE=yes pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --confirm --amount 100
```

4. Flujo app: checkout evento → Pagar con Getnet → redirect → `/checkout/return` → verificar webhook en portal Getnet.

**Nota histórica:** credenciales con prefijo `sbx_` o `cid_` inválidas en `api.pre` dieron `401 invalid_client` en pruebas locales previas. Se necesitan credenciales **PRE/Web Checkout** emitidas por Getnet para homologación.

---

## 7. Criterio para avanzar

- [ ] Auth PRE OK (`smoke:getnet-webcheckout -- --auth`)
- [ ] payment-intent PRE devuelve `payment_intent_id` + `redirect_url`
- [ ] Webhook Basic Auth configurado en portal y probado
- [ ] Build OK (`shared`, `api`, `web`)
- [ ] E2E homologación con monto mínimo (autorizado)

---

## 8. Próximo slice sugerido

**Getnet Redirect Smoke PRE** — validar credenciales PRE reales + POST payment-intent controlado + un pago homologación de punta a punta (sin merge a `main`).

---

## 9. Riesgos / pendientes

- Poll remoto Web Checkout status **no implementado** — return page depende de webhook / refresh sin consulta GET a Getnet.
- Portal Getnet puede exigir URLs fijas; si no permite editar, evaluar rutas alias (`/checkout/success`, callback API).
- `main` tiene bloque Getnet A–G (GeoPagos legacy); merge de `feat/v1-s03-api-foundation` requiere plan explícito.
- No marcar go-live en checklist hasta VPS + prueba real autorizada.

---

## 10. Enlaces rápidos

| Doc | |
|-----|--|
| Cierre slice | [GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md](../payments/GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md) |
| Implementación | [GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md](../payments/GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md) |
| Checklist prod | [Yo_Te_Invito_Checklist_V2_2_Pendientes_Produccion.md](../dev/Yo_Te_Invito_Checklist_V2_2_Pendientes_Produccion.md) §1 |
| AI entry | [AI_ENTRYPOINT.md](./AI_ENTRYPOINT.md) |
