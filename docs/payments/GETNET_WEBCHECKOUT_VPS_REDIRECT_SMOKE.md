# Getnet Web Checkout Redirect — VPS Smoke

## 1. Resumen

El flujo Web Checkout Redirect fue desplegado de forma controlada en VPS desde `feat/v1-s03-api-foundation`.

Se validó que Yo Te Invito crea el flujo de checkout y redirige correctamente al hosted checkout de Getnet.

**No está cerrado** el ciclo completo: pago aprobado + webhook procesado + emisión automática de tickets. Redirect y recepción webhook OK; fix payload `ed0cc3e` pendiente de deploy en VPS.

## 1b. Fix webhook payload (`ed0cc3e`)

En prueba de pago real, Getnet envió webhook al API pero fue rechazado:

```txt
invalid_payload: status Required (esperaba status en raíz)
```

Causa: Web Checkout envía estado en `payment.result.status` (ej. `Authorized`).

Fix en `feat/v1-s03-api-foundation` (`ed0cc3e`):

- Schema acepta `payment.result.status` sin `status` raíz.
- `Authorized` → aprobado; lookup por `payment_intent_id` / `order_id`.
- Fulfillment vía `GetnetReconciliationService` → `OrderFulfillmentService`.

**Pendiente:** deploy VPS con `ed0cc3e` y re-probar pago mínimo.

## 2. Rama

| Rama | Estado |
|------|--------|
| Desplegada en VPS | `feat/v1-s03-api-foundation` |
| `main` | Sin cambios |
| `development` | Descartada / no usada |

## 3. Servicios

| Unidad | Estado |
|--------|--------|
| `yti-web` | active (running) |
| `yti-api` | active (running) |
| `yti-scanner` | active (running) |

API Nest inició correctamente tras deploy.

## 4. Variables (VPS, sin valores)

Configuración Web Checkout en VPS (referencia operativa):

- `GETNET_WEBCHECKOUT_ENV=production`
- `GETNET_WEBCHECKOUT_AUTH_BASE_URL` → `api.globalgetnet.com` OAuth
- `GETNET_WEBCHECKOUT_API_BASE_URL` → `api.globalgetnet.com`
- `GETNET_WEBCHECKOUT_PAYMENT_INTENT_PATH` → `/dpy/web-checkout/v1/payment-intent`
- `GETNET_WEBCHECKOUT_SELLER_ID`, `CLIENT_ID`, `SECRET_KEY` — configurados en VPS (no documentar valores)
- `WEB_APP_URL=https://yoteinvito.club`
- `API_PUBLIC_URL=https://api.yoteinvito.club`
- `GETNET_WEBCHECKOUT_MERCHANT_ID` — **no usado** (opcional en código)

Webhook configurado en portal y `.env`:

- `GETNET_WEBHOOK_AUTH_MODE=basic`
- `GETNET_WEBHOOK_BASIC_USER` / `GETNET_WEBHOOK_BASIC_PASSWORD` (mismo valor en portal)
- Callback: `https://api.yoteinvito.club/public/payments/getnet/webhook`

Prueba de pago: webhook **recibido** en API; versión VPS previa a `ed0cc3e` lo rechazó (`invalid_payload`).

## 5. Smokes ejecutados (VPS)

```bash
pnpm --filter api run smoke:getnet-webcheckout -- --config
pnpm --filter api run smoke:getnet-webcheckout -- --auth
pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --dry-run
```

| Smoke | Resultado |
|-------|-----------|
| `--config` | OK |
| `--auth` | OK |
| `--payment-intent --dry-run` | OK |
| POST real sin `GETNET_WEBCHECKOUT_CONFIRM_PROD=yes` | Bloqueado correctamente |

## 6. Aliases portal Getnet

| Ruta | Resultado |
|------|-----------|
| `/checkout/success` | OK → `307` `/checkout/return` (query preservado) |
| `/checkout/error` | OK → `307` `/checkout/return?cancelled=1` |
| `/api/getnet/callback` | OK → `200` en GET (verificación / proxy compatible) |

Ver [GETNET_PORTAL_URL_COMPATIBILITY.md](./GETNET_PORTAL_URL_COMPATIBILITY.md).

## 7. Smoke real app

Desde `https://yoteinvito.club`:

| Paso | Resultado |
|------|-----------|
| Checkout real Yo Te Invito | OK |
| Redirección a `www.globalgetnet.com/hosted-web-checkout/...` | OK |
| Pago real (prueba) | Ejecutado — webhook llegó; tickets no confirmados (schema fix pendiente deploy) |

## 8. Pendientes

- [x] Configurar webhook en Portal Getnet (URL + Basic Auth).
- [x] Código API acepta payload Web Checkout — `ed0cc3e` — [GETNET_WEBHOOK.md](./GETNET_WEBHOOK.md).
- [ ] Deploy VPS con `ed0cc3e`.
- [ ] Re-probar pago mínimo autorizado.
- [ ] Confirmar webhook `Authorized` procesado (sin `invalid_payload`).
- [ ] Confirmar emisión automática de tickets (`OrderFulfillmentService`).
- [ ] Merge controlado a `main` (solo con instrucción explícita).

## 9. Riesgo actual

Con VPS **sin** `ed0cc3e`, un pago aprobado por Getnet puede no emitir tickets (webhook rechazado por schema).

Tras deploy de `ed0cc3e`, re-probar pago mínimo antes de considerar go-live.

## 10. Criterio de próximo avance

1. Deploy VPS `ed0cc3e`.
2. Pago mínimo autorizado.
3. Log API: webhook sin `invalid_payload`; `payment.result.status=Authorized` procesado.
4. Tickets emitidos vía `OrderFulfillmentService`.

Estado actual: redirect **OK**; webhook recibido **OK**; procesamiento payload **OK en repo**, pendiente validación en VPS.

## Referencias

- [GETNET_WEBHOOK.md](./GETNET_WEBHOOK.md)

- [GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md](./GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md)
- [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md)
- [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md)
