# GETNET_CHANGE_COMPARISON_AUDIT

**Fecha:** 2026-06-16  
**Rama:** `feat/v1-s03-api-foundation` (HEAD `56a9af8`)  
**Alcance:** comparación técnica Getnet Web Checkout Redirect — estado previo vs cambios 2026-06-15 (ayer) vs 2026-06-16 (hoy).  
**Modo:** solo auditoría — sin cambios de código ni deploy.

---

## 1. Resumen ejecutivo

Se auditaron los commits Getnet desde la integración Web Checkout Redirect (`5a5c794`, 2026-06-03) hasta el último cambio (`56a9af8`, 2026-06-16 09:44).

**Hallazgo principal:** los rechazos actuales con `webCheckoutStatusRaw: Denied` y `returnMessage: Anti-fraud rule achieved. Fraud risk in this transaction` **no son causados por el fix del webhook** (`ed0cc3e`). Ese fix solo procesa la notificación **después** de que Getnet ya decidió `Authorized` o `Denied`. La evidencia de producción confirma que el webhook ahora persiste correctamente el `Denied` → `REJECTED` (`processedOutcome: reconcile:REJECTED_REMOTE`).

**Cambio de hoy con mayor relevancia para el payment-intent:** `56a9af8` agregó `success_url` y `error_url` al body HTTP del `payment-intent`. Desde `4ded271` (2026-06-03) esos campos **no se enviaban** en el POST (solo se guardaban en `Payment.metadata`). Hoy se envían en la raíz del payload apuntando a `/checkout/return?...` (con query `orderId`, `paymentId`, `provider`, `tenantId`), **no** a las URLs fijas del portal Getnet (`/checkout/success`, `/checkout/error`).

**CORS e `installment-quotes 400`:** ocurren dentro del hosted checkout de Getnet (`origin: https://www.globalgetnet.com` → `https://api.globalgetnet.com`). Yo Te Invito no emite esas peticiones ni controla esos headers. **No hay evidencia de que nuestro código provoque esos errores.**

**Hipótesis más plausible para los rechazos:** combinación de **antifraude Getnet** (regla explícita en `returnMessage`), **reintentos rápidos** (varios `REJECTED` en la misma ventana, incluyendo dos pagos sobre la misma orden `cmqfwjfd…`), **datos de customer** (DNI fallback `yti-{orderId}` si el comprador no cargó documento), y posible **desalineación URL de retorno** (`/checkout/return` en payment-intent vs `/checkout/success|error` registradas en portal). El fix webhook **mejora visibilidad** del rechazo; antes el pago podía quedar `PENDING` con webhook `invalid_payload`.

**Conclusión preliminar:** no hay evidencia de que el fix webhook cause rechazos. Hay evidencia moderada de que el cambio de hoy (`success_url`/`error_url`) o factores externos Getnet/antifraude expliquen el comportamiento nuevo. Se recomienda prueba controlada aislando `56a9af8` y consulta a soporte Getnet sobre la regla antifraude y `installment-quotes`.

---

## 2. Línea de tiempo de commits Getnet

| Fecha | Commit | Resumen | Impacto payment-intent / checkout |
|-------|--------|---------|-----------------------------------|
| 2026-06-01 | `26eb70e` | Activación Getnet prod (slices A–G legacy) | Legacy Checkout API v2; base reconciliación |
| 2026-06-03 | `5a5c794` | Integración Web Checkout Redirect inicial | Payload con `mode: instant`, `configurations.success_url/error_url`, `product_type: service`, sin bloque `customer` |
| 2026-06-03 | `4ad07c1` | Aliases portal web | `/checkout/success`, `/checkout/error`, `/api/getnet/callback` — **solo frontend** |
| 2026-06-03 | `871aa04` | `merchant_id` opcional | Headers: `x-merchant-id` solo si configurado |
| 2026-06-03 | `4ded271` | **Contrato producción** | OAuth form body; `customer` + `physical_goods`; **elimina** `success_url/error_url` del HTTP; elimina `mode`/`configurations`/`expires_at` |
| 2026-06-03 | `6805435` | Customer smoke realista | Solo script smoke |
| 2026-06-03 | `6e9298d` | Sanitizar salida smoke | Solo script smoke |
| 2026-06-03 | `f4d943b` | Nest DI `GetnetModule` | Registra `GetnetWebCheckoutClientService` |
| 2026-06-03 | `a6b3fa7` | Doc VPS redirect smoke | Documentación |
| 2026-06-15 | `ed0cc3e` | **Fix webhook** `payment.result.status` | **Sin cambios** en payment-intent ni frontend checkout |
| 2026-06-15 | `2b78d96`, `9602fe9` | Docs contexto webhook | Documentación |
| 2026-06-16 | `56a9af8` | **`success_url` / `error_url` en payment-intent** | Raíz del payload → `/checkout/return?...` |

**Puntos de comparación usados en esta auditoría:**

| Etiqueta | Commit | Descripción |
|---------|--------|-------------|
| **A — Pre-ayer (VPS productivo típico)** | `ed0cc3e^` ≈ estado tras deploy `f4d943b`…`a6b3fa7` | Redirect OK; webhook rechazaba schema; payment-intent **sin** `success_url/error_url` en HTTP |
| **B — Ayer** | `ed0cc3e` | Webhook acepta `payment.result.status` |
| **C — Hoy** | `56a9af8` | Payment-intent envía `success_url` + `error_url` |

---

## 3. Archivos modificados relacionados con Getnet

| Archivo | Commit(s) | Tipo de cambio | Riesgo | Observación |
|---------|-----------|----------------|--------|-------------|
| `getnet-webcheckout-client.service.ts` | `5a5c794`, `4ded271`, `56a9af8` | Payload HTTP payment-intent | **Alto** (hoy) | Evolución: `configurations.*` → sin URLs → raíz `success_url/error_url` |
| `getnet-webcheckout.types.ts` | `5a5c794`, `4ded271`, `56a9af8` | Tipos input | Medio | `successUrl`/`errorUrl` requeridos desde hoy |
| `public-payments.service.ts` | `5a5c794`, `4ded271`, `56a9af8` | Orquestación checkout | Medio | `physical_goods`; pasa URLs al client desde hoy |
| `getnet-webcheckout-customer.util.ts` | `4ded271`, `6805435` | Customer payload | **Alto** (antifraude) | DNI fallback `yti-{orderId}`; smoke `35123456` |
| `getnet-webcheckout-auth.service.ts` | `4ded271` | OAuth | Bajo | `client_id`/`client_secret` en form body |
| `getnet-webcheckout.config.ts` | `4ded271`, `871aa04` | URLs/endpoints env | Medio | `GETNET_GLOBAL_*` fallback; merchant opcional |
| `public-payments.module.ts` | `f4d943b` | DI Nest | Bajo | Sin impacto en decisión antifraude |
| `getnet-webhook.service.ts` | `ed0cc3e` | Procesamiento webhook | Bajo | Post-decisión; lookup ampliado |
| `getnet-webhook.util.ts` | `ed0cc3e` | Normalización status | Bajo | `Authorized`→`APPROVED`, `Denied`→`REJECTED` |
| `packages/shared/.../getnet-webhook.ts` | `ed0cc3e` | Schema Zod | Bajo | `status` raíz opcional |
| `smoke-getnet-webcheckout.ts` | `4ded271`, `6805435`, `6e9298d`, `56a9af8` | Smoke | Bajo | Smoke usa `/checkout/success|error`; prod usa `/checkout/return` |
| `checkout/[eventId]/page.tsx` | (sin cambio reciente Getnet) | Redirect comprador | Bajo | `window.location.href = result.checkoutUrl` |
| `checkout/success/page.tsx`, `error/page.tsx` | `4ad07c1` | Aliases portal | Bajo | Redirect 307 → `/checkout/return` |
| `api/getnet/callback/route.ts` | `4ad07c1` | Proxy webhook | Bajo | No afecta hosted checkout |
| `getnet-return-url.util.ts` | (estable) | Construcción return URLs | Medio | Siempre `/checkout/return` + query |
| `getnet-reconciliation.service.ts` | (sin cambio en `ed0cc3e`) | Reconciliación | Bajo | Post-decisión |
| `order-fulfillment.service.ts` | (sin cambio Getnet reciente) | Emisión tickets | Bajo | Solo tras `APPROVED` |
| `docs/payments/*`, `docs/context/*` | varios | Documentación | — | Operativo |

**Archivos revisados (muestra):** todo `apps/api/src/modules/public-payments/providers/getnet/`, `getnet-webhook.service.ts`, `public-payments.service.ts`, `getnet-return-url.util.ts`, `getnet-reconciliation.service.ts`, `apps/web/app/(public)/checkout/**`, `apps/web/lib/getnet-portal-redirect.ts`, `apps/web/app/api/getnet/callback/route.ts`, `packages/shared/src/schemas/getnet-webhook.ts`, smokes `smoke-getnet*`, `.env.example` (sin valores).

---

## 4. Comparación funcional antes/después

### 4.1 Payment intent

#### Evolución del body HTTP POST `payment-intent`

| Campo | `5a5c794` (inicial) | `4ded271`…`ed0cc3e` (pre-hoy) | `56a9af8` (hoy) |
|-------|---------------------|-------------------------------|-----------------|
| `mode` | `instant` | — (eliminado) | — |
| `configurations.success_url` | sí (`input.successUrl`) | — | — |
| `configurations.error_url` | sí (`input.errorUrl`) | — | — |
| `configurations.3ds` | `true` | — | — |
| `success_url` (raíz) | — | — | **sí** |
| `error_url` (raíz) | — | — | **sí** |
| `order_id` | sí | sí | sí |
| `payment.currency` / `amount` | sí | sí | sí |
| `product[].product_type` | `service` | **`physical_goods`** | `physical_goods` |
| `product[].title/description/value/quantity` | sí | sí | sí |
| `customer.*` | **no** | **sí** (bloque completo) | sí |
| `expires_at` | `15m` | — | — |

#### Valores actuales en producción (`public-payments.service.ts`)

| Campo | Valor / origen | ¿Cambió ayer/hoy? |
|-------|----------------|-------------------|
| `order_id` | `order.id` (cuid Prisma) | No |
| `payment.amount` | centavos orden | No |
| `payment.currency` | moneda orden (`ARS`) | No |
| `product_type` | `physical_goods` | No (desde `4ded271`) |
| `customer.document_number` | `buyerDocument` o fallback `yti-{orderIdSuffix}` | No (desde `4ded271`) |
| `customer.email` | email comprador orden | No |
| `customer.checked_email` | `true` fijo | No |
| `success_url` | `https://yoteinvito.club/checkout/return?orderId=…&paymentId=…&provider=getnet&tenantId=…` | **Sí — hoy `56a9af8`** |
| `error_url` | Igual + `cancelled=1` | **Sí — hoy `56a9af8`** |

**Nota URL:** el portal Getnet tiene URLs fijas `/checkout/success` y `/checkout/error` ([GETNET_PORTAL_URL_COMPATIBILITY.md](../payments/GETNET_PORTAL_URL_COMPATIBILITY.md)). El payment-intent de hoy envía **`/checkout/return`** con query params. Los aliases portal siguen funcionando si Getnet redirige a las URLs fijas; el payment-intent ahora declara URLs distintas en el body.

#### Factores que pueden disparar antifraude (evaluados)

| Factor | En nuestro código | ¿Cambió 15–16 jun? |
|--------|-------------------|---------------------|
| DNI genérico / fallback | `yti-{orderId}` sin `buyerDocument` | No |
| Email repetido en smoke | Solo smoke script | No en prod |
| `product_type` tickets como `physical_goods` | Sí | No (jun-03) |
| Monto | Según ticket | No por código |
| Reintentos misma orden | Posible (evidencia: 2 payments misma `orderId`) | Operativo, no código |
| URLs retorno en payment-intent | Ausentes → **presentes hoy** | **Sí (hoy)** |

### 4.2 Redirect hosted checkout

| Aspecto | Antes (pre-hoy) | Ahora |
|---------|-----------------|-------|
| Respuesta API | `checkoutUrl` = `redirect_url` Getnet | Igual |
| Frontend | `window.location.href = result.checkoutUrl` | **Sin cambio** desde integración |
| Nueva pestaña / router | No — full redirect | Igual |
| `sessionStorage` | `getnet-payment:{orderId}` → `paymentId` | Igual |
| Metadata guardada | `paymentIntentId`, `redirectUrl`, `returnUrl`, `errorUrl` | Igual + URLs ahora también en POST Getnet |

El comprador **sí llega** al hosted checkout (`www.globalgetnet.com/hosted-web-checkout/...`). El rechazo ocurre **dentro** del flujo Getnet (antifraude), no en nuestra redirección inicial.

### 4.3 Return/error URLs

| Fuente | URL | Query params |
|--------|-----|--------------|
| Portal Getnet (fijas) | `/checkout/success`, `/checkout/error` | Getnet puede o no preservar params |
| `buildCheckoutReturnUrl` (API metadata + payment-intent hoy) | `/checkout/return` | `orderId`, `paymentId`, `provider=getnet`, `tenantId`, opcional `cancelled=1` |
| Alias `success/page.tsx` | 307 → `/checkout/return` + params preservados | Sí |
| Alias `error/page.tsx` | 307 → `/checkout/return?cancelled=1` + params | Sí |

**Antes de hoy:** `returnUrl`/`errorUrl` existían en `Payment.metadata` pero **no** se enviaban a Getnet en el POST (desde `4ded271`).  
**Hoy:** mismas URLs YTI, ahora **sí** en el body del payment-intent.

**Impacto en resultado del pago:** las return URLs afectan **redirección post-pago** y posiblemente **scoring antifraude** en Getnet. No afectan la autorización en sí desde nuestro backend (no hay callback síncrono nuestro durante el cobro).

### 4.4 Webhook

| | Antes `ed0cc3e` | Después `ed0cc3e` |
|--|----------------|-------------------|
| Payload Getnet | `payment.result.status` (`Authorized`/`Denied`) | Igual |
| Schema YTI | Exigía `status` raíz → `invalid_payload` | Acepta anidado |
| `Denied` | No procesado / quedaba `PENDING` | `REJECTED` + metadata |
| `Authorized` | No procesado | `APPROVED` + fulfill vía reconciliación |
| Lookup | `payment_intent_id` principalmente | + `order_id`, `payment.result.payment_id` |
| Idempotencia | Sí | Sí + metadata Web Checkout |

**Técnicamente:** el webhook es un `POST` asíncrono al API **después** de la transacción en Getnet. No participa en la decisión antifraude del hosted checkout. El mensaje `Anti-fraud rule achieved` viene en `payment.result.return_message` del webhook — es la **explicación de Getnet**, no un mensaje generado por YTI.

### 4.5 Reconciliación / fulfillment

- `GetnetReconciliationService` y `OrderFulfillmentService`: **sin cambios** en `ed0cc3e` ni `56a9af8`.
- Estados: `Denied` → `REJECTED` vía `mapGetnetWebhookStatusToLocal` + reconciliación con `remoteStatusOverride`.
- Tickets: solo `OrderFulfillmentService` tras `APPROVED` — sin bypass detectado.
- `processedOutcome: reconcile:REJECTED_REMOTE` en metadata confirma flujo post-webhook correcto.

### 4.6 Frontend checkout

| Componente | Cambio reciente Getnet |
|------------|------------------------|
| `checkout/[eventId]/page.tsx` | No (redirect Getnet estable) |
| `checkout/return/page.tsx` | No |
| `checkout/success`, `error` | Desde `4ad07c1` (jun-03) — aliases |
| `CheckoutPaymentStatusView` | No |

El frontend **no cambió** entre ayer y hoy en el flujo Getnet.

### 4.7 Variables de entorno

Revisado `apps/api/.env.example` — sin cambios Getnet entre `ed0cc3e` y `56a9af8`.

| Variable | Uso | ¿Cambio en código reciente? |
|----------|-----|----------------------------|
| `GETNET_WEBCHECKOUT_ENV` | `production` en VPS | No |
| `GETNET_WEBCHECKOUT_AUTH_BASE_URL` | OAuth Global | No (desde `4ded271`) |
| `GETNET_WEBCHECKOUT_*` / `GETNET_GLOBAL_*` | Credenciales seller | No en repo |
| `GETNET_WEBCHECKOUT_MERCHANT_ID` | Opcional | No |
| `GETNET_WEBHOOK_BASIC_*` | Webhook portal | No en repo |
| `WEB_APP_URL` | Base return URLs | Config VPS — no auditable en git |

**No hay evidencia en git** de rotación de seller/credenciales entre ayer y hoy. Cualquier cambio manual en VPS `.env` quedaría fuera del diff.

---

## 5. Hipótesis evaluadas

| Hipótesis | Evidencia a favor | Evidencia en contra | Probabilidad | Próximo paso |
|-----------|-------------------|---------------------|--------------|--------------|
| **Fix webhook causa rechazo** | Coincidencia temporal deploy + rechazos visibles | Webhook es post-decisión; `returnMessage` viene de Getnet; CORS/AF en hosted checkout | **Muy baja** | Ninguno — descartar |
| **Credenciales/seller/config cambió** | Podría explicar `installment-quotes 400` | Sin diff env en repo; OAuth y payment-intent siguen OK | Media-baja | Confirmar con soporte Getnet seller habilitado (cuotas, medios) |
| **Antifraude por reintentos** | 4 `REJECTED` + 1 `PENDING`; 2 payments misma orden; mensaje explícito AF | Primer intento también rechazado | **Alta** | Esperar cooling-off; probar 1 intento con datos reales completos |
| **CORS interno Getnet** | Error en consola `www.globalgetnet.com` → `api.globalgetnet.com/lx/afgi` | Origen es dominio Getnet; no enviamos `request-id` | **Muy baja (nuestro código)** | Escalar a soporte Getnet (incidente hosted checkout) |
| **Cuotas / installment-quotes 400** | `bff-checkout/installment-quotes -> 400` en consola | No hay código nuestro en ese BFF | **Alta (lado Getnet/config)** | Preguntar a Getnet si comercio tiene cuotas habilitadas |
| **Payload customer/product incompleto** | DNI fallback `yti-*`; tickets como `physical_goods` | Igual antes de ayer; customer block desde jun-03 | Media | Capturar DNI real en checkout UI |
| **Frontend redirect distinto** | — | `window.location.href` sin cambio | **Muy baja** | Ninguno |
| **Return URL sin query params** | Usuario reporta retorno sin params | Aliases preservan params; payment-intent hoy incluye URLs con query | Media (UX) | Verificar qué URL usa Getnet al volver (success vs return) |
| **`success_url/error_url` hoy desalinean portal** | Portal fijo `/checkout/success`; POST hoy `/checkout/return` | Antes no se enviaban URLs en POST (portal default) | **Media-alta** | Prueba A/B: URLs portal vs `/checkout/return` |
| **Cambio `physical_goods` + customer (jun-03)** | Puede afectar AF vs `service` sin customer | Cambio anterior a ayer; redirect funcionó en VPS | Baja-media | Solo si se compara con intentos pre-jun-03 |

---

## 6. Riesgos encontrados

1. **R1 — Visibilidad vs causalidad:** el fix webhook hace visibles los `Denied` que antes dejaban `PENDING` o fallaban en schema. Puede parecer regresión cuando es mejor diagnóstico.

2. **R2 — URLs payment-intent vs portal (hoy):** `56a9af8` envía `/checkout/return?...` mientras el portal documenta `/checkout/success` y `/checkout/error`. Posible impacto en antifraude o redirección.

3. **R3 — DNI fallback:** `yti-{orderId}` cuando falta `buyerDocument` puede elevar score de fraude en producción.

4. **R4 — Velocidad de reintentos:** múltiples payment-intents en minutos sobre la misma u otras órdenes.

5. **R5 — Dependencia Getnet interna:** CORS en `lx/afgi` e `installment-quotes 400` indican fricción en el hosted checkout fuera de nuestro control.

6. **R6 — Smoke vs prod URL mismatch:** smoke usa `/checkout/success|error`; prod usa `/checkout/return` — puede ocultar problemas en pruebas smoke.

---

## 7. Recomendaciones

### Acciones en nuestro código (no ejecutar hasta revisión)

1. **Aislar `56a9af8`:** deploy temporal con `ed0cc3e` sin `success_url/error_url` en HTTP, o revertir solo ese commit en VPS, y un único intento controlado.
2. **Alinear URLs con portal:** si Getnet exige coincidencia, enviar `success_url` = `https://yoteinvito.club/checkout/success` y `error_url` = `https://yoteinvito.club/checkout/error` (los aliases ya redirigen a `/checkout/return`).
3. **Exigir DNI en checkout** antes de `createPaymentIntent` para reducir fallback `yti-*`.
4. **Log estructurado (sin PCI):** hash de `order_id`, presencia de `buyerDocument`, longitud query en URLs — sin loguear `redirect_url` completo.

### Acciones con soporte Getnet

1. Consultar regla **"Anti-fraud rule achieved. Fraud risk in this transaction"** para seller `GETNET_WEBCHECKOUT_SELLER_ID` (sin pegar valor en tickets públicos).
2. Reportar **CORS** `request-id` en `api.globalgetnet.com/lx/afgi/api/fl/...` desde `www.globalgetnet.com`.
3. Consultar **`installment-quotes 400`**: ¿cuotas habilitadas? ¿medio de pago de prueba válido?
4. Confirmar si payment-intent debe usar URLs del portal (`/checkout/success|error`) o `/checkout/return`.

### Pruebas manuales (sin nuevos pagos reales salvo autorización explícita)

1. **Dry-run smoke:** `pnpm --filter api run smoke:getnet-webcheckout -- --payment-intent --dry-run` — comparar preview payload pre/post `56a9af8`.
2. **Inspección DB:** comparar metadata del pago `PENDING` (`cmqfvq3he…`) vs último `REJECTED` — ¿mismo customer? ¿mismo patrón DNI?
3. **curl -I aliases:** verificar 307 de `/checkout/success` y `/checkout/error` con params.
4. **Tras aislar commit:** un solo pago mínimo con DNI/email reales y sin reintentos en 24 h.

---

## 8. Conclusión

| Pregunta | Respuesta |
|----------|-----------|
| ¿Nuestro cambio causó los rechazos antifraude? | **No hay evidencia del fix webhook (`ed0cc3e`).** Evidencia **moderada** de que el cambio de hoy (`success_url`/`error_url` en payment-intent) o factores Getnet/antifraude/reintentos los explican. |
| ¿El fix webhook empeoró el checkout? | **No técnicamente.** Solo procesa el resultado ya decidido por Getnet. Antes, `Denied` no se reflejaba correctamente en YTI. |
| ¿CORS / installment-quotes son nuestros? | **No.** Son internos del hosted checkout Getnet. |
| ¿Qué cambió realmente entre ayer y hoy en el flujo de cobro? | **Ayer:** solo webhook. **Hoy:** payment-intent incluye URLs de retorno en el POST. |

**Evidencia que apunta a Getnet/configuración/antifraude:** mensaje `returnMessage` explícito; errores en dominios Getnet; `installment-quotes 400`; regla AF en payload webhook.

**Evidencia que apunta a nuestro código:** introducción hoy de `success_url`/`error_url` con paths distintos al portal; DNI fallback; histórico `physical_goods` + customer (más antiguo).

**Próximo paso sugerido:** prueba controlada aislando `56a9af8` + consulta soporte Getnet sobre antifraude y cuotas, antes de más pagos reales.

---

## Anexo A — Evidencia de producción analizada

```
cmqfx1pdr… | GETNET | REJECTED | order cmqfx1nz… | intent 578a07ad-…
cmqfx0zep… | GETNET | REJECTED | order cmqfwjfd… | intent 7105d9f3-…
cmqfwlbm9… | GETNET | REJECTED | order cmqfwla0… | intent ad3b7dba-…
cmqfwjgs5… | GETNET | REJECTED | order cmqfwjfd… | intent 2a93cbad-…  ← misma orden que cmqfx0zep
cmqfvq3he… | GETNET | PENDING  | order cmqfvq0z… | intent 4e0060d6-…
```

Metadata último rechazo (resumida):

- `webCheckoutStatusRaw: Denied`
- `remoteStatus: DENIED`
- `returnMessage: Anti-fraud rule achieved. Fraud risk in this transaction`
- `processedOutcome: reconcile:REJECTED_REMOTE`

## Anexo B — Commits comparados (comandos)

```bash
git log --oneline --grep="getnet" -i -n 20
git diff ed0cc3e^..ed0cc3e -- apps/api packages/shared
git diff ed0cc3e..56a9af8 -- apps/api/src/modules/public-payments/
git show 5a5c794:apps/api/.../getnet-webcheckout-client.service.ts  # payload inicial
git show 4ded271:apps/api/.../getnet-webcheckout-client.service.ts  # contrato prod
```

## Anexo C — Headers payment-intent (estable)

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
x-seller-id: <seller>
x-merchant-id: <solo si GETNET_*_MERCHANT_ID configurado>
```

No se agregaron headers que afecten CORS del hosted checkout (ese CORS es browser-side en dominio Getnet).

---

*Documento generado en auditoría read-only. No commitear hasta revisión del responsable.*
