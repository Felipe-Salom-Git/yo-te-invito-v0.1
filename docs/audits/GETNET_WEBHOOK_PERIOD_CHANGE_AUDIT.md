# GETNET_WEBHOOK_PERIOD_CHANGE_AUDIT

**Fecha:** 2026-06-16  
**Rama:** `feat/v1-s03-api-foundation`  
**Modo:** auditoría read-only — sin cambios de código, deploy ni pagos reales.

---

## 1. Resumen ejecutivo

Se auditó el período **desde el commit inmediatamente anterior al fix del webhook Web Checkout** hasta **HEAD**, con foco en si algún cambio pudo alterar el comportamiento del **checkout/pago antes de la decisión de Getnet**.

| Punto | Commit | Fecha |
|-------|--------|-------|
| **A — Base (pre-webhook)** | `84707cd` (`ed0cc3e^`) | 2026-06-15 20:41 |
| **B — Fix webhook** | `ed0cc3e` | 2026-06-15 21:17 |
| **C — Estado actual** | `3e009f4` (HEAD) | 2026-06-16 (revert URLs payment-intent) |

**Conclusión principal:**

1. **`ed0cc3e` no puede causar rechazo antifraude en Getnet.** Solo modifica recepción/procesamiento del webhook **después** de que Getnet ya emitió `payment.result.status` (`Authorized` / `Denied`). No toca `payment-intent`, headers hacia Getnet, frontend checkout ni reconciliación base.

2. **El fix webhook sí cambió estados visibles en Yo Te Invito:** antes, payloads Web Checkout con `payment.result.status` fallaban schema (`invalid_payload`); `Denied` no se persistía como `REJECTED`. Después, el mismo `Denied` se registra correctamente con `returnMessage` de Getnet (incl. antifraude).

3. **El único cambio post-webhook que modifica el request HTTP a Getnet** es `56a9af8` (hoy): agrega `success_url` y `error_url` al body del `payment-intent`. Entre `ed0cc3e^` y `ed0cc3e` el payload enviado a Getnet fue **idéntico**.

4. **CORS `www.globalgetnet.com` → `api.globalgetnet.com/lx/afgi` e `installment-quotes 400`:** sin cambios nuestros en ese período; no explicables por código YTI.

5. **Para aislar prueba:** comparar VPS con `ed0cc3e` (sin `56a9af8`) vs HEAD; el webhook fix no es candidato a revertir por antifraude.

---

## 2. Rango auditado

```bash
Base:         ed0cc3e^  →  84707cd  fix(scanner): resolve gastro parent profile...
Webhook fix:  ed0cc3e    →  fix(getnet): accept webcheckout authorization webhook payload
HEAD:         56a9af8    →  feat(getnet): add success_url/error_url to Web Checkout payment-intent
```

**Comandos ejecutados:**

```bash
git diff ed0cc3e^..ed0cc3e --stat -- apps/api packages/shared apps/web docs
git diff ed0cc3e..HEAD --stat -- apps/api packages/shared apps/web docs
git diff ed0cc3e^..HEAD -- apps/api/src/modules/public-payments/ ...
```

**Commits en `ed0cc3e^..HEAD` (13 total):** 1 Getnet código webhook (`ed0cc3e`), 1 Getnet código payment-intent (`56a9af8`), 3 docs Getnet (`2b78d96`, `9602fe9`, `0a740d2` parcial), 8 geo/scanner/docs no-Getnet.

---

## 3. Commits revisados desde el webhook

| Commit | Fecha | Archivos Getnet tocados | Tipo | Riesgo pre-decisión |
|--------|-------|-------------------------|------|---------------------|
| `ed0cc3e` | 2026-06-15 21:17 | schema webhook, `getnet-webhook.util.ts`, `getnet-webhook.service.ts`, tests, docs | **Post-decisión** (webhook) | **Ninguno** |
| `2b78d96` | 2026-06-15 22:01 | `docs/context/*`, `docs/payments/GETNET_WEBHOOK.md` | Documentación | Ninguno |
| `9602fe9` | 2026-06-15 22:01 | `GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md`, contexto | Documentación | Ninguno |
| `0a740d2` | 2026-06-16 | `docs/context/*`, checklists (menciones Getnet) | Documentación | Ninguno |
| `56a9af8` | 2026-06-16 09:44 | `getnet-webcheckout-client.service.ts`, types, `public-payments.service.ts`, smoke, docs | **Pre-decisión** (payment-intent) | **Medio** (URLs retorno) |
| `5932f3b`…`1936cb3` | 2026-06-15–16 | geo / admin forms — **no** checkout Getnet | No relacionado | Ninguno |

---

## 4. Archivos modificados desde `ed0cc3e^`

### 4.1 Tabla completa (solo archivos Getnet / pagos en el período)

| Archivo | Commit | Cambio | Pre / Post | ¿Puede causar antifraude? |
|---------|--------|--------|------------|---------------------------|
| `packages/shared/src/schemas/getnet-webhook.ts` | `ed0cc3e` | `status` raíz opcional; `payment.result.status`; campos Web Checkout | **Post** | **No** |
| `getnet-webhook.util.ts` | `ed0cc3e` | `normalizeGetnetWebhookStatus`, lookup keys, metadata WC, `AUTHORIZED`/`DENIED` | **Post** | **No** |
| `getnet-webhook.service.ts` | `ed0cc3e` | Lookup ampliado; `appendWebCheckoutWebhookMetadata` | **Post** | **No** |
| `test-getnet-webhook.util.ts` | `ed0cc3e` | Tests unitarios webhook | **Post** | **No** |
| `getnet-webcheckout-client.service.ts` | `56a9af8` | `success_url`, `error_url` en payload | **Pre** | **Posible** (validación URL merchant) |
| `getnet-webcheckout.types.ts` | `56a9af8` | `successUrl`, `errorUrl` en input | **Pre** | Indirecto |
| `public-payments.service.ts` | `56a9af8` | Pasa `returnUrl`/`errorUrl` al client | **Pre** | Indirecto |
| `smoke-getnet-webcheckout.ts` | `56a9af8` | Smoke incluye URLs (`/checkout/success\|error`) | Smoke only | No prod |
| `docs/payments/GETNET_WEBHOOK.md` | `ed0cc3e`, `2b78d96`, `9602fe9`, `56a9af8` | Documentación webhook / incidente VPS | — | No |
| `docs/payments/GETNET_*` (otros) | docs commits | Estado VPS, smoke, handoff | — | No |
| `docs/context/*` | docs commits | Pendientes, entrypoint | — | No |
| `docs/modules/getnet-payment-integration.md` | `ed0cc3e`, docs | Referencias estado | — | No |

### 4.2 Archivos Getnet **no modificados** en `ed0cc3e^..HEAD` (verificado con `git diff` vacío)

| Archivo | Implicación |
|---------|-------------|
| `getnet-reconciliation.service.ts` | Reconciliación sin cambios en el período |
| `order-fulfillment.service.ts` | Fulfillment sin cambios |
| `getnet-return-url.util.ts` | URLs `/checkout/return?...` sin cambios |
| `getnet-webcheckout-auth.service.ts` | OAuth sin cambios |
| `getnet-webcheckout.config.ts` | Endpoints/env sin cambios en repo |
| `getnet-webcheckout-customer.util.ts` | Customer/DNI fallback sin cambios |
| `public-payments.module.ts` | DI sin cambios |
| `apps/web/app/(public)/checkout/**` | Frontend checkout sin cambios |
| `apps/web/lib/getnet-portal-redirect.ts` | Aliases portal sin cambios |
| `apps/web/app/api/getnet/callback/route.ts` | Proxy webhook sin cambios |
| `apps/api/.env.example` (claves `GETNET_*`) | Sin cambios en el período |

---

## 5. Comparación payment-intent

### 5.1 Tabla de campos

| Campo | `ed0cc3e^` | `ed0cc3e` | `HEAD` (`56a9af8`) | ¿Cambió en período? | Riesgo antifraude |
|-------|------------|-----------|---------------------|---------------------|-------------------|
| `mode` | — | — | — | No (eliminado antes, jun-03) | — |
| `configurations` | — | — | — | No | — |
| `expires_at` | — | — | — | No | — |
| `order_id` | `order.id` | igual | igual | No | Bajo |
| `payment.currency` | moneda orden | igual | igual | No | Bajo |
| `payment.amount` | centavos | igual | igual | No | Bajo |
| `product[].product_type` | `physical_goods` | igual | igual | No | Medio (histórico) |
| `product[].title` | nombre ticket | igual | igual | No | Bajo |
| `product[].description` | `Entrada Yo Te Invito` | igual | igual | No | Bajo |
| `product[].value` | precio unitario ×100 | igual | igual | No | Bajo |
| `product[].quantity` | cantidad ítem | igual | igual | No | Bajo |
| `customer.customer_id` | DNI o fallback | igual | igual | No | **Medio** (fallback `yti-*`) |
| `customer.first_name` | comprador | igual | igual | No | Bajo |
| `customer.last_name` | comprador | igual | igual | No | Bajo |
| `customer.name` | concatenado | igual | igual | No | Bajo |
| `customer.email` | email orden | igual | igual | No | Bajo |
| `customer.document_type` | `DNI` | igual | igual | No | Bajo |
| `customer.document_number` | doc o `yti-{suffix}` | igual | igual | No | **Medio** |
| `customer.checked_email` | `true` | igual | igual | No | Bajo |
| `success_url` | **no enviado** | **no enviado** | **sí** → `/checkout/return?orderId&paymentId&provider&tenantId` | **Sí (`56a9af8`)** | **Medio** |
| `error_url` | **no enviado** | **no enviado** | **sí** → `/checkout/return?...&cancelled=1` | **Sí (`56a9af8`)** | **Medio** |

### 5.2 Headers HTTP hacia Getnet (sin cambios en período)

```
Content-Type: application/json
Accept: application/json
Authorization: Bearer <token>
x-seller-id: <GETNET_WEBCHECKOUT_SELLER_ID>
x-merchant-id: <solo si GETNET_*_MERCHANT_ID configurado>
```

### 5.3 Metadata local (siempre, incluso pre-`56a9af8`)

`Payment.metadata` guardaba `returnUrl` y `errorUrl` (mismas URLs `/checkout/return`) **antes** de enviarlas a Getnet. El cambio de hoy duplica esas URLs en el POST al API de Getnet.

---

## 6. Comparación webhook (`ed0cc3e`)

### 6.1 Schema (`getnet-webhook.ts`)

| Antes (`ed0cc3e^`) | Después (`ed0cc3e`) |
|--------------------|---------------------|
| `status` **requerido** en raíz | `status` opcional en raíz |
| Sin modelo `payment.result` | `payment.result.status`, `payment_id`, `return_message`, etc. |
| Sin `payment_intent_id` / `order_id` explícitos | Campos Web Checkout aceptados |
| Falla: `path: ["status"], message: "Required"` | Pasa con `payment.result.status: "Denied"` |

### 6.2 Helpers (`getnet-webhook.util.ts`)

| Función / comportamiento | Nuevo en `ed0cc3e` |
|--------------------------|-------------------|
| `normalizeGetnetWebhookStatus()` | Lee raíz o `payment.result.status` |
| `extractGetnetPaymentLookupKeys()` | `payment_intent_id`, `order_id`, `payment.result.payment_id` |
| `extractGetnetWebCheckoutWebhookInfo()` | `returnMessage`, `authorizationCode`, `checkoutId`, etc. |
| `appendWebCheckoutWebhookMetadata()` | Historial + `lastWebCheckoutWebhook` |
| `AUTHORIZED` → `APPROVED` | Sí |
| `DENIED` → `REJECTED` | Sí |

### 6.3 Servicio (`getnet-webhook.service.ts`)

- Lookup de `Payment` por múltiples claves (no solo `externalReference`).
- Persistencia metadata Web Checkout tras reconciliación.
- **Flujo:** webhook → `GetnetReconciliationService.reconcilePayment` con `remoteStatusOverride` → actualiza `Payment` → fulfill si `APPROVED`.

### 6.4 Lo que **no** tocó `ed0cc3e`

- `getnet-webcheckout-client.service.ts` — payment-intent
- `public-payments.service.ts` — creación de pago
- `getnet-reconciliation.service.ts` — lógica de reconciliación (solo se invoca con nuevo status)
- Frontend checkout / return
- Headers OAuth / payment-intent
- Variables `.env.example`

### 6.5 ¿Puede `ed0cc3e` provocar `Anti-fraud rule achieved`?

**No.** Ese mensaje llega en `payment.result.return_message` **desde Getnet** en el webhook, es decir **después** de la evaluación antifraude en el hosted checkout. Nuestro código no envía nada a Getnet en el handler del webhook que influya en esa decisión.

---

## 7. Comparación frontend / return URLs

| Aspecto | `ed0cc3e^` | `ed0cc3e` | `HEAD` |
|---------|------------|-----------|--------|
| Redirect a hosted checkout | `window.location.href = checkoutUrl` | igual | igual |
| `/checkout/return` | Poll + refresh status | igual | igual |
| `/checkout/success` → alias | 307 → `/checkout/return` | igual | igual |
| `/checkout/error` → alias | 307 → `cancelled=1` | igual | igual |
| `/api/getnet/callback` proxy | Sin cambios | igual | igual |
| `buildCheckoutReturnUrl()` | `/checkout/return?orderId&paymentId&provider&tenantId` | igual | igual |
| URLs en payment-intent HTTP | No | No | Sí (mismas URLs que metadata) |

**Portal Getnet (documentado):** URLs fijas `/checkout/success` y `/checkout/error`. **Payment-intent HEAD** envía `/checkout/return` con query — posible desalineación solo desde `56a9af8`, no desde `ed0cc3e`.

---

## 8. Hipótesis

| Hipótesis | Evidencia a favor | Evidencia en contra | Conclusión |
|-----------|-------------------|---------------------|------------|
| Fix webhook causa antifraude | Coincidencia temporal | Webhook es post-decisión; sin cambio payment-intent | **Descartada** |
| Fix webhook solo hizo visible el `Denied` | Logs `invalid_payload` antes; `REJECTED` + `returnMessage` después; código confirma mapping | — | **Confirmada** |
| Desde webhook se modificó payment-intent | — | `ed0cc3e` no toca client/service pagos | **Falso para `ed0cc3e`** |
| Post-webhook sí modificó payment-intent | `56a9af8` agrega `success_url`/`error_url` | Único commit funcional post-webhook | **Verdadero solo para `56a9af8`** |
| CORS interno Getnet es nuestro | Error en consola hosted checkout | Sin cambios nuestros; origen `www.globalgetnet.com` | **Lado Getnet** |
| `installment-quotes 400` es nuestro | Error en BFF Getnet | Sin código nuestro en ese endpoint | **Lado Getnet/config** |
| Reintentos disparan antifraude | 4 `REJECTED`, 2 misma orden | También aplica pre-webhook | **Operativo / Getnet** |
| DNI fallback `yti-*` dispara antifraude | Sin `buyerDocument` en UI | Sin cambio en período | **Riesgo preexistente** |

---

## 9. Respuesta directa

### ¿Qué cambió desde ayer (período webhook)?

**Código funcional Getnet:**

1. **`ed0cc3e`:** webhook Web Checkout real (`payment.result.status`, lookup, metadata, `Denied`→`REJECTED`).
2. **`56a9af8`:** `success_url` / `error_url` en payment-intent HTTP.

**Resto:** documentación y contexto (`2b78d96`, `9602fe9`, `0a740d2`); commits geo/admin **no** afectan Getnet checkout.

### ¿Qué puede afectar Getnet **antes** de decidir?

Solo **`56a9af8`** en este período: URLs de retorno en el body del `payment-intent`.

Factores **sin cambio en el período** pero relevantes: customer/DNI, `physical_goods`, monto, reintentos, config seller (VPS).

### ¿Qué solo afecta procesamiento **posterior**?

Todo **`ed0cc3e`:** schema, normalización status, lookup Payment, metadata webhook, idempotencia, reconciliación vía override, visibilidad de `REJECTED`/`APPROVED`.

### ¿El webhook fix pudo causar el rechazo?

**No.** Pudo causar que un rechazo **ya decidido por Getnet** se vea como `REJECTED` en lugar de `PENDING` / `invalid_payload`.

### ¿Qué aislar primero?

1. **Deploy `ed0cc3e` sin `56a9af8`** — un intento controlado.
2. Si persiste antifraude con payload idéntico a pre-hoy → escalar a Getnet (regla AF, cuotas, CORS interno).
3. **No revertir `ed0cc3e`** por antifraude; empeoraría diagnóstico.

### Respuestas a las 11 preguntas del brief

| # | Pregunta | Respuesta |
|---|----------|-----------|
| 1 | ¿Fix webhook causa rechazo AF? | **No** |
| 2 | ¿Solo hizo visible rechazo no registrado? | **Sí** — principal efecto de `ed0cc3e` |
| 3 | ¿Desde webhook se modificó payment-intent? | **No** en `ed0cc3e`; **sí** después en `56a9af8` |
| 4 | ¿Primer commit post-webhook que modifica request Getnet? | **`56a9af8`** |
| 5 | ¿Cambios frontend desde webhook? | **No** en checkout Getnet |
| 6 | ¿Cambios URLs desde webhook? | **En HTTP:** solo `56a9af8`. Metadata/return util: sin cambio |
| 7 | ¿Cambios customer/document desde webhook? | **No** |
| 8 | ¿Cambios headers hacia Getnet? | **No** |
| 9 | ¿CORS interno explicable por nosotros? | **No** |
| 10 | ¿installment-quotes 400 explicable por nosotros? | **No** |
| 11 | ¿Qué aislar? | `56a9af8` primero; no `ed0cc3e` por AF |

---

## 10. Variables de entorno

### Cambios en git (`ed0cc3e^..HEAD`)

| Variable | ¿Cambió en código/repo? |
|----------|-------------------------|
| `GETNET_WEBCHECKOUT_*` | **No** |
| `GETNET_GLOBAL_*` | **No** |
| `GETNET_WEBHOOK_*` | **No** |
| `WEB_APP_URL` | **No** en repo (usa `getWebAppBaseUrl()` igual) |
| `API_PUBLIC_URL` / `NEXT_PUBLIC_API_URL` | **No** en período Getnet |

`apps/api/.env.example` en `ed0cc3e..HEAD` solo agregó claves **Google Geocoding** — no Getnet.

### Cambios manuales VPS

No auditables desde git. Cualquier rotación de seller/credenciales en `.env` del servidor quedaría fuera del diff. Requiere verificación operativa manual (sin pegar secretos).

---

## 11. Evidencia de producción

### Payments

```
cmqfx1pdr… | REJECTED | intent 578a07ad-…
cmqfx0zep… | REJECTED | orden cmqfwjfd… (reintento)
cmqfwlbm9… | REJECTED
cmqfwjgs5… | REJECTED | misma orden cmqfwjfd…
cmqfvq3he… | PENDING  | posible abandono o webhook no Denied/Authorized
```

### Metadata último rechazo (resumida)

```
webCheckoutStatusRaw: Denied
remoteStatus: DENIED
returnMessage: Anti-fraud rule achieved. Fraud risk in this transaction
processedOutcome: reconcile:REJECTED_REMOTE
```

**Interpretación con código:** Getnet envió `Denied` + mensaje AF → webhook `ed0cc3e` lo procesó → reconciliación marcó `REJECTED`. El antifraude ocurrió **en Getnet**; YTI solo reflejó el resultado.

### Logs

| Fase | Comportamiento |
|------|----------------|
| Antes `ed0cc3e` | `invalid_payload: status Required` |
| Después `ed0cc3e` | `Denied` procesado; `Payment` → `REJECTED`; sin nuevo `invalid_payload` |

---

## 12. Grupo A vs Grupo B (resumen)

### Grupo A — Puede afectar decisión Getnet (hosted checkout / payment-intent)

| Cambio en período | Commit |
|-------------------|--------|
| `success_url` / `error_url` en POST payment-intent | `56a9af8` |

Sin cambios en período: customer, product, amount, headers, redirect frontend, auth.

### Grupo B — Solo después de decisión Getnet

| Cambio en período | Commit |
|-------------------|--------|
| Schema webhook Web Checkout | `ed0cc3e` |
| Normalización `Authorized`/`Denied` | `ed0cc3e` |
| Lookup `payment_intent_id` / `order_id` / `payment_id` | `ed0cc3e` |
| Metadata `webCheckoutWebhookEvents`, `returnMessage` | `ed0cc3e` |
| Idempotencia webhook (sin cambio de lógica base) | `ed0cc3e` |
| Invocación reconciliación con `remoteStatusOverride` | `ed0cc3e` (entrada status ya decidido) |

---

## 13. Recomendación final

1. **Tratar `ed0cc3e` como mejora de observabilidad**, no como causa de antifraude.
2. **Revert `56a9af8` aplicado** (`3e009f4`) — payload payment-intent sin URLs en HTTP; validar en VPS si AF persiste.
3. **Consultar Getnet** sobre regla AF, `installment-quotes 400` y CORS en `lx/afgi`.
4. **Reducir reintentos** y usar DNI real en checkout antes de nuevos intentos productivos.
5. ~~**Reconciliar 3 pagos PENDING aprobados en portal**~~ — **cerrado** vía `payments:reconcile-getnet-approved-manual` (ver §15).

---

## 14. Reconciliación manual — pagos aprobados PENDING (2026-06-16)

### Situación

Tres pagos Web Checkout figuran **aprobados en portal Getnet** pero `Payment.status = PENDING` y `Order.status = EXPIRED` (0 tickets) porque webhooks anteriores fallaron por schema (`invalid_payload` pre-`ed0cc3e`) y las órdenes expiraron antes de reconciliar.

| Payment | Order | paymentIntentId |
|---------|-------|-----------------|
| `cmqfvq3he000g4xc0momiekpo` | `cmqfvq0zw000c4xc0tpbs1qjg` | `4e0060d6-db64-43b8-a233-b20393f87c64` |
| `cmpxtuix7001d40xb4xk2net3` | `cmpxtuh3y001940xbqom4b7xn` | `4eda2db5-5606-4f84-9fb5-8584d58ecead` |
| `cmpxsxjhx000t40xb2m3c04mz` | `cmpxsxf44000p40xbc6r458ck` | `27985504-01e5-42b5-8421-218d209d1893` |

### ¿Alcanza `POST /admin/payments/:id/reconcile`?

**No.** Web Checkout no tiene poll remoto; el endpoint no pasa `remoteStatusOverride` → `REMOTE_STATUS_UNAVAILABLE`.

### Mecanismo implementado

| Script | Caso |
|--------|------|
| `reconcile:getnet-approved` | `PENDING_PAYMENT` vigente — **no** cumple con `EXPIRED` |
| `payments:reconcile-getnet-approved-manual` | `PENDING`/`APPROVED` + `EXPIRED` + tickets incompletos |

Cambios de dominio:

- `GetnetReconciliationService`: `forceExpiredApprovedFulfillment` bypass `ORDER_EXPIRED_PAYMENT_APPROVED` → fulfill.
- `OrderFulfillmentService`: `allowExpiredRecovery` — `EXPIRED` → `PAID`, `TicketBatchService.sellDirectFromBatch` (sin reserva previa).
- Script: `apps/api/scripts/reconcile-getnet-approved-manual.ts` — gate `CONFIRM_GETNET_APPROVED_MANUAL=yes`.

Runbook: [GETNET_MANUAL_RECONCILIATION_RUNBOOK.md](../payments/GETNET_MANUAL_RECONCILIATION_RUNBOOK.md).

---

## 15. Cierre recovery manual Web Checkout (2026-06)

### Resultado productivo

Los 3 pagos afectados por webhook pre-`ed0cc3e` quedaron recuperados:

| Payment | Order | Estado final |
|---------|-------|--------------|
| `cmqfvq3he000g4xc0momiekpo` | `cmqfvq0zw000c4xc0tpbs1qjg` | `APPROVED` / `FULFILLED` / `PAID` / 1 ticket |
| `cmpxsxjhx000t40xb2m3c04mz` | `cmpxsxf44000p40xbc6r458ck` | `APPROVED` / `FULFILLED` / `PAID` / 1 ticket |
| `cmpxtuix7001d40xb4xk2net3` | `cmpxtuh3y001940xbqom4b7xn` | `APPROVED` / `FULFILLED` / `PAID` / 1 ticket |

### Commits del recovery

| Commit | Descripción |
|--------|-------------|
| `ed0cc3e` | Fix webhook — acepta `payment.result.status` |
| `9e3b406` | Script manual + `allowExpiredRecovery` / `forceExpiredApprovedFulfillment` |
| `35cb725` | Resume tras fulfillment parcial (`OrderFulfillmentService` DI) |
| `4707af5` | Fix TDZ `existingTickets` en script CLI |

### Validaciones

- Webhook fix `ed0cc3e`: desplegado; futuros `Authorized`/`Denied` procesables.
- Recovery manual: probado en prod; incluye resume de estado parcial (`APPROVED` + `EXPIRED` + 0 tickets).
- Sin SQL manual, inserts directos de tickets ni bypass de dominio.

### Pendiente separado (fuera de este bloque)

- Rechazos antifraude Getnet (`Denied`, `Anti-fraud rule achieved`) en **nuevas** operaciones — revisión con soporte Getnet.
- Re-prueba pago mínimo autorizado end-to-end con webhook automático post-deploy.

Runbook: [GETNET_MANUAL_RECONCILIATION_RUNBOOK.md](../payments/GETNET_MANUAL_RECONCILIATION_RUNBOOK.md).

---

## Anexo — Archivos revisados

```
packages/shared/src/schemas/getnet-webhook.ts
apps/api/src/modules/public-payments/getnet-webhook.service.ts
apps/api/src/modules/public-payments/providers/getnet/getnet-webhook.util.ts
apps/api/src/modules/public-payments/providers/getnet/webcheckout/*
apps/api/src/modules/public-payments/public-payments.service.ts
apps/api/src/modules/public-payments/getnet-reconciliation.service.ts
apps/api/src/modules/public-payments/order-fulfillment.service.ts
apps/api/src/modules/public-payments/getnet-return-url.util.ts
apps/api/scripts/smoke-getnet-webcheckout.ts
apps/api/scripts/reconcile-getnet-approved-manual.ts
apps/api/scripts/reconcile-approved-getnet-webcheckout-payment.ts
apps/web/app/(public)/checkout/**
apps/web/app/api/getnet/callback/route.ts
apps/web/lib/getnet-portal-redirect.ts
docs/payments/*
docs/modules/getnet-payment-integration.md
docs/context/CONTEXT_PENDIENTES.md
```

---

*Documento actualizado con cierre recovery manual (2026-06).*
