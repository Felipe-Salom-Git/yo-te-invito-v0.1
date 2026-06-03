# Getnet Web Checkout Redirect — VPS Smoke

## 1. Resumen

El flujo Web Checkout Redirect fue desplegado de forma controlada en VPS desde `feat/v1-s03-api-foundation`.

Se validó que Yo Te Invito crea el flujo de checkout y redirige correctamente al hosted checkout de Getnet.

**No está cerrado** el ciclo completo: pago aprobado + webhook + emisión automática de tickets (webhook Portal Getnet pendiente).

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

Webhook preparado en `.env` (pendiente portal):

- `GETNET_WEBHOOK_AUTH_MODE=basic`
- `GETNET_WEBHOOK_BASIC_USER` / `GETNET_WEBHOOK_BASIC_PASSWORD` — deben coincidir con Portal Getnet

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
| Pago real completado | **No ejecutado** |

## 8. Pendientes

- [ ] Encontrar/configurar webhook en Portal Getnet.
- [ ] Registrar URL callback:
  - Preferida: `https://api.yoteinvito.club/public/payments/getnet/webhook`
  - Compatible: `https://yoteinvito.club/api/getnet/callback` (proxy Next.js → API)
- [ ] Configurar Basic Auth del webhook en Portal Getnet (mismo user/password que `GETNET_WEBHOOK_BASIC_*` en API).
- [ ] Probar pago mínimo autorizado.
- [ ] Confirmar webhook recibido en logs API.
- [ ] Confirmar cambio de estado `Payment` / `Order`.
- [ ] Confirmar emisión automática de tickets (`OrderFulfillmentService`).
- [ ] Merge controlado a `main` (solo con instrucción explícita).

## 9. Riesgo actual

**No realizar pago real** hasta confirmar webhook o estrategia de conciliación manual acordada.

Si se paga antes de configurar el webhook en el portal:

- Getnet puede aprobar el cobro.
- Yo Te Invito puede **no** recibir la notificación.
- La orden puede quedar pendiente.
- Los tickets pueden **no** emitirse automáticamente.

## 10. Criterio de próximo avance

Avanzar cuando soporte Getnet confirme en el portal:

- URL del webhook
- Usuario Basic Auth del webhook
- Contraseña Basic Auth del webhook

Hasta entonces: redirect productivo **OK**; ciclo de cobro cerrado **pendiente**.

## Referencias

- [GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md](./GETNET_WEBCHECKOUT_REDIRECT_IMPLEMENTATION.md)
- [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md)
- [GETNET_ACTIVATION_CHECKLIST.md](./GETNET_ACTIVATION_CHECKLIST.md)
