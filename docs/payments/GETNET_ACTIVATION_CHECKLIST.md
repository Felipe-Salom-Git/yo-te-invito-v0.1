# Getnet Activation Checklist — Yo Te Invito

Checklist operativa para activar pagos Getnet en staging o producción con riesgo controlado.  
Complementa: [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md), [getnet-payment-integration.md](../modules/getnet-payment-integration.md).

---

## 1. Precondiciones

- [ ] `pnpm --filter @yo-te-invito/shared build` OK
- [ ] `pnpm --filter api run build` OK
- [ ] `pnpm --filter web run build` OK
- [ ] Migraciones aplicadas en el entorno objetivo (`npx prisma migrate deploy`)
- [ ] Migración `20260601140000_audit_payment_actions` aplicada (acciones `PAYMENT_*` en auditoría)
- [ ] Admin real operativo (`felipe.e.salom@gmail.com` o rol `ADMIN`)
- [ ] Emails operativos (SMTP/Resend) para confirmación de orden y alertas críticas
- [ ] `GETNET_WEBHOOK_SECRET` configurado en API y (si aplica) en dashboard Getnet / proxy
- [ ] `WEB_APP_URL` (o `APP_URL`) apunta al dominio público del comprador
- [ ] Return/cancel URL coherentes con Getnet (ver §4)
- [ ] Getnet **solo** habilitado cuando el negocio autorice cobros reales (no dejar credenciales prod en dev compartido)

---

## 2. Variables de entorno

| Variable | App | Requerida en prod | Ejemplo (sin secreto) | Uso |
|----------|-----|------------------:|------------------------|-----|
| `GETNET_ENV` | API | Sí | `staging` / `production` | Preset URLs auth/checkout |
| `GETNET_CLIENT_ID` | API | Sí (Getnet on) | `cli_…` | OAuth client_credentials |
| `GETNET_CLIENT_SECRET` | API | Sí (Getnet on) | `(secret)` | OAuth |
| `GETNET_SCOPE` | API | No | `*` | Scope OAuth |
| `GETNET_AUTH_BASE_URL` | API | No | `https://auth.prd.geopagos.io` | Override auth |
| `GETNET_CHECKOUT_BASE_URL` | API | No | `https://api.globalgetnet.com.ar` | Override checkout API |
| `GETNET_WEBHOOK_SECRET` | API | Sí en prod | `(secret)` | Header shared secret |
| `GETNET_WEBHOOK_HEADER_NAME` | API | No | `x-getnet-webhook-secret` | Nombre del header |
| `GETNET_WEBHOOK_REQUIRE_SECRET` | API | Recomendado | `true` | Fuerza secret si no es production |
| `GETNET_RECONCILE_CONFIRM_PROD` | API | Sí p/ reconcile mutante | `yes` | `payments:reconcile-getnet --confirm` en prod |
| `WEB_APP_URL` | API | Sí | `https://yoteinvito.club` | `returnUrl` / `cancelUrl` en metadata |
| `APP_URL` | API | Fallback | `https://yoteinvito.club` | Links email / notificaciones |
| `NEXT_PUBLIC_APP_URL` | Web/API | Fallback | `https://yoteinvito.club` | SEO + fallback return URL |
| `NEXT_PUBLIC_API_BASE_URL` | Web | Sí | `https://api.yoteinvito.club` | Cliente HTTP web |
| `API_BASE_URL` | Scripts | No | `https://api.yoteinvito.club` | Smokes / ops |
| `NODE_ENV` | API | Sí | `production` | Activa `requireSecret` webhook |
| `NEXT_PUBLIC_PAYMENT_PROVIDER_DEFAULT` | Web | No | `DEMO` | Default UI; no fuerza backend |
| `MAIL_PROVIDER` | API | Sí p/ emails | `smtp` | Confirmación orden |
| `SMOKE_GETNET_CONFIRM_PROD` | Scripts | Solo smokes mutantes | `yes` | `smoke:getnet --simulate-webhook` en prod |

**Provider:** no hay `PAYMENT_PROVIDER` global en API; cada checkout elige `DEMO` o `GETNET` en `POST /public/orders/:id/payments`. En prod, **no** ofrecer botón demo al público (solo QA interno).

Validación rápida:

```bash
pnpm --filter api run smoke:getnet -- --config
pnpm --filter api run smoke:getnet -- --config --check-auth
```

---

## 3. Migraciones

En VPS (desde `apps/api`):

```bash
cd /opt/yoteinvito/apps/api
npx prisma migrate deploy
```

Verificar que exista:

- `20260601140000_audit_payment_actions` — enum `AuditAction` + `PAYMENT_ADMIN_RECONCILED`, `PAYMENT_MANUAL_REVIEWED`

Sin esta migración, marcar pagos revisados desde admin puede fallar al escribir auditoría.

---

## 4. Configuración en dashboard Getnet

Confirmar con Getnet/Santander (checklist cliente):

| Ítem | Valor sugerido |
|------|----------------|
| Ambiente | Sandbox vs producción alineado con `GETNET_ENV` |
| Credenciales | Mismo par que `GETNET_CLIENT_ID` / `SECRET` |
| Merchant / comercio | Documentar ID si aplica |
| Webhook URL | `https://api.yoteinvito.club/public/payments/getnet/webhook` |
| Webhook auth | Header `x-getnet-webhook-secret` (o `GETNET_WEBHOOK_HEADER_NAME`) = `GETNET_WEBHOOK_SECRET` |
| Return URL | `https://yoteinvito.club/checkout/return?orderId=…&paymentId=…&tenantId=…` |
| Cancel URL | Misma base + `cancelled=1` |
| URLs por operación | La API guarda `returnUrl`/`cancelUrl` en `Payment.metadata` al crear pago; confirmar si Getnet usa esas URLs o solo dashboard |
| Medios de pago | **Pendiente confirmación** — restricción por operación no implementada en código |
| Firma oficial webhook | **Pendiente** — hoy shared secret en header ([GETNET_WEBHOOK.md](./GETNET_WEBHOOK.md)) |

---

## 5. Configuración en VPS

Referencia: [DONWEB_PRODUCTION_RUNBOOK.md](../deploy/DONWEB_PRODUCTION_RUNBOOK.md) §15, §25.

```bash
ssh yoteinvito
cd /opt/yoteinvito
git pull
pnpm install --frozen-lockfile
pnpm --filter @yo-te-invito/shared build
cd apps/api
npx prisma migrate deploy
cd ../..
pnpm build
sudo systemctl restart yti-api yti-web yti-scanner
curl -sS https://api.yoteinvito.club/health
pnpm --filter api run smoke:getnet -- --config --api-base https://api.yoteinvito.club
```

Variables Getnet en `/opt/yoteinvito/apps/api/.env` (o secret manager). **No** commitear `.env`.

---

## 6. Smoke backend

```bash
pnpm --filter api run smoke:getnet -- --config
pnpm --filter api run test:getnet-auth
pnpm --filter api run test:getnet-webhook
pnpm --filter api run test:getnet-reconciliation
pnpm --filter api run test:order-fulfillment
pnpm --filter api run payments:reconcile-getnet -- --dry-run --limit 10
```

---

## 7. Smoke frontend comprador

Ver [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md) — casos 1–3.

Rutas: `/checkout/[eventId]`, `/checkout/return`, `/me/tickets`, `/me/orders/[orderId]`.

---

## 8. Smoke admin

1. Login admin → `/admin/pagos`
2. Filtrar `GETNET` + “requiere revisión”
3. Detalle → reconciliar / marcar revisado (caso manual)
4. Verificar auditoría en `/admin/auditoria` (`PAYMENT_*`)

---

## 9. Smoke webhook

```bash
# Local/staging (API corriendo)
pnpm --filter api run smoke:getnet -- --simulate-webhook --payment-id <paymentId> --status APPROVED

# Duplicado (mismo --event-id dos veces)
pnpm --filter api run smoke:getnet -- --simulate-webhook --payment-id <id> --event-id dup-test-1
pnpm --filter api run smoke:getnet -- --simulate-webhook --payment-id <id> --event-id dup-test-1
```

Producción: `SMOKE_GETNET_CONFIRM_PROD=yes` además del flag anterior.

---

## 10. Smoke reconciliación

```bash
pnpm --filter api run payments:reconcile-getnet -- --dry-run --limit 20
# Solo si hace falta mutar:
GETNET_RECONCILE_CONFIRM_PROD=yes pnpm --filter api run payments:reconcile-getnet -- --confirm --limit 5
```

Admin: `POST /admin/payments/:id/reconcile` desde UI.

---

## 11. Casos de error esperados

| Caso | Comportamiento esperado |
|------|-------------------------|
| Webhook sin secret | `401` en prod |
| Webhook sin payment local | `payment_not_found` + alerta operativa |
| Webhook duplicado | `duplicate`, sin tickets extra |
| Orden expirada + APPROVED | `REQUIRES_MANUAL_REVIEW`, sin tickets |
| Pago rechazado/cancelado | Sin tickets; UI return correcta |
| Reconcile remoto rechazado | Payment `REJECTED`, orden sigue pendiente |

---

## 12. Rollback

1. **No** borrar pagos ni órdenes en BD.
2. Dejar de ofrecer Getnet en UI (ocultar botón / solo demo interno).
3. Opcional: quitar credenciales Getnet del `.env` API (checkout Getnet devuelve 404).
4. `sudo systemctl restart yti-api yti-web`
5. Resolver casos abiertos en `/admin/pagos` (reconciliar / marcar revisado).
6. Si hubo cobros reales en curso: contactar compradores y Getnet; documentar en nota admin.
7. Webhook puede seguir activo en Getnet — desactivar URL en dashboard si se corta tráfico.

**No** hacer `migrate reset` ni borrar `Payment` aprobados.

---

## 13. No incluido en esta activación

- Facturación automática
- Service fee / comisión al comprador
- Reembolsos automáticos
- Reversa de tickets
- Emisión manual de tickets desde admin
- Firma criptográfica oficial Getnet (hasta confirmación del proveedor)
- Restricción de medios de pago por operación (hasta confirmación Getnet)
- Resolución financiera garantizada desde la plataforma

---

## Próximo paso

Tras activación controlada en VPS: [GETNET_PRODUCTION_SMOKE.md](./GETNET_PRODUCTION_SMOKE.md) Caso 1 (monto mínimo autorizado).  
Cierre del bloque código/docs: [GETNET_CLOSING_AUDIT.md](./GETNET_CLOSING_AUDIT.md).
