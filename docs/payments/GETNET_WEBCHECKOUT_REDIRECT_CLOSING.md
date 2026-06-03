# Getnet Web Checkout Redirect — Closing Notes

**Fecha:** 2026-06-01  
**Alcance:** cierre documental del slice de integración limpia (sin deploy, sin merge a `main`).

---

## 1. Estado final

| Ítem | Estado |
|------|--------|
| Código Web Checkout Redirect | Implementado en `feat/v1-s03-api-foundation` |
| Rama `development` | Descartada y eliminada (local + remoto) |
| Rama `main` | Sin cambios por este slice |
| Go-live producción | **No** — pendiente smoke PRE + VPS + merge |
| Spikes exploratorios (`development`) | **No** mergeados ni reutilizados en código productivo |

---

## 2. Decisión técnica

**V1 usa Web Checkout Redirect**, no iFrame ni Lightbox.

Cuando `GETNET_WEBCHECKOUT_*` está configurado, `PublicPaymentsService` prioriza:

`POST {api}/dpy/web-checkout/v1/payment-intent` → `payment_intent_id` + `redirect_url` → redirección del comprador.

Si no hay credenciales Web Checkout, se mantiene el **fallback legacy** GeoPagos (`GETNET_CLIENT_*` → `POST /api/v2/orders`).

---

## 3. Por qué Redirect

- Menor riesgo frontend
- Mejor compatibilidad mobile
- Menor complejidad PCI / CSP / postMessage
- Encaja con `/checkout/return` existente
- Encaja con webhook / reconciliación / `OrderFulfillmentService` existentes (slices A–G)

---

## 4. Rama y commit

| Campo | Valor |
|-------|--------|
| Rama de trabajo | `feat/v1-s03-api-foundation` |
| Commit técnico | `5a5c794` — `feat(getnet): integrate webcheckout redirect payment intent` |
| Push | `origin/feat/v1-s03-api-foundation` |
| `main` | Sin cambios |
| `development` | Descartada y eliminada — **no usar**, no mergear, no cherry-pick |

**Política de ramas vigente:**

```txt
feat/v1-s03-api-foundation → desarrollo
main → producción (solo con instrucción explícita)
```

---

## 5. Flujo implementado

1. Yo Te Invito crea `Order` + `Payment` local (`PENDING`).
2. Backend crea **payment-intent** en Getnet Web Checkout (`api.pre` / prod).
3. Getnet devuelve `payment_intent_id` + `redirect_url`.
4. Frontend redirige al comprador (`window.location.href = checkoutUrl` / `redirectUrl`).
5. Comprador paga en Getnet (hosted).
6. Getnet vuelve a `/checkout/return` (`success_url` / `error_url`).
7. **Webhook** (Basic Auth según portal) confirma estado.
8. `GetnetReconciliationService` + **`OrderFulfillmentService.fulfillPaidOrder()`** emiten tickets (único punto de emisión).

---

## 6. Variables de entorno

### Web Checkout Redirect (nuevas — activas cuando están seteadas)

| Variable | Uso |
|----------|-----|
| `GETNET_WEBCHECKOUT_ENV` | `pre` (default), `sandbox`, `production` |
| `GETNET_*_AUTH_BASE_URL` | OAuth form body (`client_id` + `client_secret`, no Basic Auth) |
| `GETNET_*_WEBCHECKOUT_BASE_URL` | ej. `https://api.globalgetnet.com/dpy/web-checkout/v1` |
| `GETNET_*_PAYMENT_INTENT_PATH` | `/payment-intent` |
| `GETNET_*_MERCHANT_ID` | Opcional — `x-merchant-id` solo si definido |
| `GETNET_*_SELLER_ID` | Requerido — `x-seller-id` |
| `GETNET_*_CLIENT_ID` / `SECRET_KEY` | Requeridos — OAuth body |
| `GETNET_WEBCHECKOUT_CONFIRM_PRE` | `yes` + `--confirm` — smoke POST **pre** only |
| `GETNET_WEBCHECKOUT_CONFIRM_PROD` | `yes` + `--confirm` — smoke POST **production** only |

Prefijo `GETNET_WEBCHECKOUT_*` o fallback `GETNET_GLOBAL_*`.

### Webhook

| Variable | Uso |
|----------|-----|
| `GETNET_WEBHOOK_AUTH_MODE` | `basic` (portal Web Checkout) o `header` (legacy) |
| `GETNET_WEBHOOK_BASIC_USER` | Usuario webhook portal |
| `GETNET_WEBHOOK_BASIC_PASSWORD` | Contraseña webhook portal |
| `GETNET_WEBHOOK_SECRET` | Legacy header shared secret |
| `GETNET_WEBHOOK_HEADER_NAME` | Default `x-getnet-webhook-secret` |

### URLs públicas

| Variable | Uso |
|----------|-----|
| `WEB_APP_URL` | `success_url` / `error_url` en payment-intent |
| `API_PUBLIC_URL` / `API_PUBLIC_BASE_URL` | Documentación / ops (webhook URL pública) |

### Legacy (fallback — no mezclar con Web Checkout)

`GETNET_ENV`, `GETNET_CLIENT_ID`, `GETNET_CLIENT_SECRET`, `GETNET_AUTH_BASE_URL`, `GETNET_CHECKOUT_BASE_URL`.

Ver `apps/api/.env.example`.

---

## 7. Smoke commands

```bash
pnpm --filter api run smoke:getnet-webcheckout -- --config
pnpm --filter api run smoke:getnet-webcheckout -- --auth
pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --dry-run
```

POST controlado homologación (solo PRE, nunca prod desde smoke):

```bash
GETNET_WEBCHECKOUT_CONFIRM_PRE=yes pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --confirm --amount 100
```

Smoke legacy (GeoPagos / webhook simulado): `pnpm --filter api run smoke:getnet -- --config`

---

## 8. Validaciones realizadas (slice técnico `5a5c794`)

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter @yo-te-invito/shared build` | OK |
| `pnpm --filter api run build` | OK |
| `pnpm --filter web run build` | OK |
| `pnpm --filter api run test:getnet-webhook` | OK |

**Validado en rama `feat/v1-s03-api-foundation` (smoke local con credenciales en `.env`, no commitear):**

- [x] Auth producción (`smoke:getnet-webcheckout -- --auth`) — OK.
- [x] POST payment-intent producción controlado (`GETNET_WEBCHECKOUT_CONFIRM_PROD=yes`, `--amount 50000`) — OK; `payment_intent_id` + `redirect_url` recibidos; logs sanitizados.

### Smoke productivo payment-intent

- Auth producción: OK
- Payment intent producción: OK
- Monto usado: 50000 centavos / $500,00 ARS
- `payment_intent_id`: recibido
- `redirect_url`: recibido y sanitizado en consola
- Pago no confirmado desde este smoke
- Próximo paso: probar flujo app local / checkout real Yo Te Invito

---

## 9. Pendientes

- [ ] Credenciales PRE válidas en `apps/api/.env` local (no commitear) — opcional si prod ya validado.
- [ ] `smoke:getnet-webcheckout -- --auth` en PRE si se requiere homologación separada.
- [ ] POST payment-intent PRE controlado (opcional si prod OK).
- [ ] Configurar webhook Basic Auth en portal Getnet (URL + user/password).
- [ ] Flujo E2E: checkout → redirect → return → webhook → tickets.
- [ ] Implementar poll remoto payment-intent status si Getnet documenta GET (hoy webhook es camino principal).
- [ ] Deploy VPS en rama de desarrollo cuando corresponda.
- [ ] Prueba homologación con monto mínimo autorizado.
- [ ] Merge a `main` solo con instrucción explícita.

---

## 10. Fuera de alcance

- iFrame / Lightbox (V2)
- WooCommerce / VTEX / Payment Link BR
- Facturación automática
- Service fee / comisión al comprador
- Reembolsos automáticos
- Emisión manual de tickets desde admin
- Reutilizar scripts/spikes de `development`

---

## Referencias

| Doc | Uso |
|-----|-----|
| [GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md](./GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md) | Implementación |
| [NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md](../context/NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md) | Handoff próximo chat |
| [GETNET_CLOSING_AUDIT.md](./GETNET_CLOSING_AUDIT.md) | Bloque A–G (`main`) + nota Web Checkout |
| [getnet-payment-integration.md](../modules/getnet-payment-integration.md) | Variables y flujos |
