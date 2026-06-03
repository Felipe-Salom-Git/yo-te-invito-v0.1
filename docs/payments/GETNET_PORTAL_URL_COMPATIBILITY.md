# Getnet Portal URL Compatibility

## 1. Problema

El portal Getnet tiene configuradas URLs fijas que no se pueden modificar actualmente en el dashboard de producción.

## 2. URLs del portal

| Uso | URL fija (portal) |
|-----|-------------------|
| Éxito comprador | `https://yoteinvito.club/checkout/success` |
| Error / cancelación | `https://yoteinvito.club/checkout/error` |
| Callback / webhook | `https://yoteinvito.club/api/getnet/callback` |

## 3. URLs internas recomendadas

| Uso | URL recomendada |
|-----|-----------------|
| Retorno comprador | `https://yoteinvito.club/checkout/return` |
| Webhook API | `https://api.yoteinvito.club/public/payments/getnet/webhook` |

La API sigue generando `success_url` / `error_url` hacia `/checkout/return` cuando configura payment-intent (`buildCheckoutReturnUrl`). Los alias cubren el desvío del portal.

## 4. Solución

| Alias | Comportamiento |
|-------|----------------|
| `GET /checkout/success` | Si `orderIds` (carrito demo invitado) → UI legacy demo. Si no → redirect a `/checkout/return` preservando query. |
| `GET /checkout/error` | Redirect a `/checkout/return?cancelled=1` preservando `orderId`, `paymentId`, `tenantId`, etc. |
| `POST /api/getnet/callback` | Proxy server-side al webhook Nest (`API_PUBLIC_URL` / fallback `NEXT_PUBLIC_API_BASE_URL`). |
| `GET /api/getnet/callback` | `{ ok: true }` para verificación del portal. |

Implementación:

- `apps/web/lib/getnet-portal-redirect.ts`
- `apps/web/app/(public)/checkout/success/page.tsx`
- `apps/web/app/(public)/checkout/error/page.tsx`
- `apps/web/app/api/getnet/callback/route.ts`

## 5. Seguridad

- No loguear `Authorization`, body ni secretos de webhook.
- Reenviar `Authorization: Basic …` y `x-getnet-webhook-secret` (o `GETNET_WEBHOOK_HEADER_NAME`) al API.
- No reenviar cookies del comprador.
- Validación final de credenciales en API (`GetnetWebhookService` — `GETNET_WEBHOOK_AUTH_MODE=basic` o header).

## 6. Variables de entorno (web)

| Variable | Uso |
|----------|-----|
| `API_PUBLIC_URL` | Base del API para el proxy (prod: `https://api.yoteinvito.club`) |
| `GETNET_WEBHOOK_HEADER_NAME` | Opcional; nombre del header secreto a reenviar |

## 7. Pendiente

Cuando Getnet permita editar URLs en el portal, configurar directamente:

- Return: `/checkout/return`
- Webhook: `https://api.yoteinvito.club/public/payments/getnet/webhook`

y retirar alias si ya no hacen falta.

## Smoke local

```bash
# Return aliases (browser o curl -L)
curl -I "http://localhost:3000/checkout/success?orderId=abc&paymentId=pay-1"
curl -I "http://localhost:3000/checkout/error?orderId=abc"

# Callback proxy
curl -i -X POST http://localhost:3000/api/getnet/callback \
  -H "Content-Type: application/json" \
  -d '{"test":true}'
```

Demo carrito: `http://localhost:3000/checkout/success?orderIds=ord-1,ord-2` debe seguir mostrando la UI demo (sin redirect).
