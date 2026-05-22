# Guía de smoke tests y E2E — Yo Te Invito

Pruebas automatizadas contra la **API** (scripts `smoke:*`) y la **web** (Playwright). No reemplazan pruebas manuales de negocio completas.

Ver: [DEMO_REMOVAL.md](./DEMO_REMOVAL.md) · [DEVELOPER_SCRIPTS_GUIDE.md](./DEVELOPER_SCRIPTS_GUIDE.md)

---

## Reglas

- **Sin `@demo.local` por defecto** — credenciales explícitas en variables de entorno.
- **Sin `demo:seed`** — datos de prueba = cuenta real + contenido publicado manualmente.
- **Cleanup automático** tras cada smoke (salvo `SMOKE_SKIP_CLEANUP=1`).
- **Pago demo** en `smoke:user-portal` es flujo de producto (`demo-confirm`), no seed de datos.

---

## Requisitos comunes

```bash
pnpm db:up
pnpm db:migrate
pnpm dev:api          # :3001
# Para E2E además:
pnpm dev:web          # :3000
```

Cuenta recomendada: `felipe.e.salom@gmail.com` (u otra en BD con contraseña conocida).

---

## Variables de entorno (smokes API)

| Variable | Requerido | Uso |
|----------|-----------|-----|
| `SMOKE_USER_EMAIL` | **Sí** | Login principal en todos los smokes |
| `SMOKE_USER_PASSWORD` | **Sí** | Contraseña |
| `SMOKE_SECOND_USER_EMAIL` | No | Segundo usuario en transferencias |
| `SMOKE_SCANNER_EMAIL` / `SMOKE_SCANNER_PASSWORD` | No | Validación QR en `smoke:user-portal` |
| `SMOKE_PRODUCER_EMAIL`, `SMOKE_GASTRO_EMAIL`, `SMOKE_REFERRER_EMAIL`, `SMOKE_ADMIN_EMAIL` | No | Roles extra en `smoke:reviews` y `smoke:referrals` (productor + referido) |
| `SMOKE_PRODUCER_PASSWORD`, `SMOKE_REFERRER_PASSWORD` | No | Si difieren de `SMOKE_USER_PASSWORD` |
| `SMOKE_EVENT_ID` | No | Evento APPROVED con tipos de entrada (`smoke:referrals`) |
| `SMOKE_REFERRER_PROFILE_ID` | No | Cuid del perfil referido (si no se infiere de `GET /referrer/me`) |
| `SMOKE_SECOND_PRODUCER_EMAIL` | No | Verificar que otra productora no puede `mark-paid` ajena |
| `SMOKE_ALLOW_DEV_AUTH=1` | No | Fallback `X-Dev-User-Id` (solo dev) |
| `SMOKE_SKIP_CLEANUP=1` | No | No borrar artefactos al finalizar |
| `SMOKE_CLEANUP_BEFORE=1` | No | Limpiar antes de ejecutar |
| `SMOKE_ALLOW_DESTRUCTIVE=1` | No | Ejecutar test de **aceptar** transferencia (mueve ticket) |
| `SMOKE_REGISTER_PASSWORD` | No | Password al registrar `*@smoke.yo-te-invito.test` |

Ejemplo:

```bash
SMOKE_USER_EMAIL=felipe.e.salom@gmail.com SMOKE_USER_PASSWORD=<pass> pnpm --filter api run smoke:user-portal
```

---

## Smokes API — resumen

| Comando | Riesgo DB | Persiste | Notas |
|---------|-----------|----------|--------|
| `smoke:api` | Casi no | No | Health + login |
| `smoke:producer-follows` | Mínimo | Follow (se borra al final) | Requiere productora ACTIVE en tenant |
| `smoke:notifications` | Sí | Notif `e2e-demo:*` | Requiere rol ADMIN para seed-demo |
| `smoke:reviews` | Sí | Reviews `[smoke-test]` | Muchos `skip` sin eventos/roles |
| `smoke:user-portal` | **Alto** | Órdenes, usuarios smoke, transfers | Necesita evento con entradas para cobertura completa |
| `smoke:referrals` | **Alto** | Propuestas, órdenes atribuidas, comisiones, solicitudes de pago | Requiere `SMOKE_PRODUCER_EMAIL` + `SMOKE_REFERRER_EMAIL`, asociación ACTIVE y evento APPROVED |

### `smoke:api`

```bash
SMOKE_USER_EMAIL=... SMOKE_USER_PASSWORD=... pnpm --filter api run smoke:api
```

Endpoints públicos, `/me`, órdenes/tickets, login.

### `smoke:producer-follows`

```bash
pnpm --filter api run smoke:producer-follows
```

Follows + recomendaciones + dashboard; elimina el follow creado al final.

### `smoke:notifications`

```bash
pnpm --filter api run smoke:notifications
```

Lista notificaciones, `POST /admin/notifications/seed-demo`, run del job. Usuario debe ser **ADMIN** (o `SMOKE_USER_EMAIL` con rol admin).

### `smoke:reviews`

```bash
SMOKE_USER_EMAIL=... SMOKE_USER_PASSWORD=... pnpm --filter api run smoke:reviews
```

Reviews públicas, réplicas productor/gastro, moderación admin, B2B, y verificación de kinds en `GET /me/notifications` (`REVIEW_RECEIVED`, `REVIEW_OFFICIAL_REPLY`). Opcional:

```bash
SMOKE_PRODUCER_EMAIL=... SMOKE_GASTRO_EMAIL=... SMOKE_REFERRER_EMAIL=... SMOKE_ADMIN_EMAIL=...
```

Documentación de dominio: [docs/reviews/REVIEWS_V2.md](../reviews/REVIEWS_V2.md).

### `smoke:referrals`

Contrato Referidos V2: propuesta → aceptación → link → orden con `referralCode` → `demo-confirm` → comisión `CONFIRMED` → solicitud de pago → `mark-in-review` / `mark-paid` (liquidación **externa**, registro informativo).

```bash
SMOKE_USER_EMAIL=... SMOKE_USER_PASSWORD=... \
SMOKE_PRODUCER_EMAIL=... SMOKE_REFERRER_EMAIL=... \
pnpm --filter api run smoke:referrals
```

| Requisito | Notas |
|-----------|--------|
| Productor + referido | Usuarios reales con perfiles y membresías; no `@demo.local` |
| Asociación | `ProducerReferrerRelationship` en estado `ACTIVE` |
| Evento | `SMOKE_EVENT_ID` o primer evento `APPROVED` del productor con tipos de entrada públicos |
| Persistencia | Crea orden/comisión/solicitud; `smoke:cleanup` estándar al final (no revierte `mark-paid`) |

Tests util relacionados: `test:referral-proposals`, `test:referral-commission`, `test:referral-payment-requests`.

Documentación: [docs/referrals/REFERRALS_V2.md](../referrals/REFERRALS_V2.md).

### `smoke:user-portal`

Contrato REST del portal `/me/*`: dashboard, preferencias, favoritos, esperados, carrito, checkout, **pago demo**, transferencias, scanner.

```bash
SMOKE_USER_EMAIL=felipe.e.salom@gmail.com SMOKE_USER_PASSWORD=<pass> pnpm --filter api run smoke:user-portal
```

| Área | Notas |
|------|--------|
| Carrito / checkout | Crea orden `PENDING_PAYMENT` |
| Pago demo | `demo-confirm` → tickets |
| Detalle ticket | `GET /me/tickets/:id` — `qrPayload` debe ser `yti:v1:…` |
| Scanner | Con `SMOKE_SCANNER_*`: `POST /scanner/validate` rechaza QR en `TRANSFER_PENDING` |
| Transferencias | Ticket `VALID`; segundo usuario (`SMOKE_SECOND_USER_EMAIL` o registro `@smoke.yo-te-invito.test`) |
| Aceptar transferencia | Solo con `SMOKE_ALLOW_DESTRUCTIVE=1` |

Referencias: [docs/user/USER_PORTAL.md](../user/USER_PORTAL.md), [docs/user/TICKET_TRANSFER.md](../user/TICKET_TRANSFER.md).

### `test:gastro-discount-scan` (manual / CI local)

Validación de descuentos gastro en puerta. Requiere API en `:3001` y `DEV_AUTH_ENABLED=true`.

```bash
pnpm --filter api run test:gastro-discount-scan
```

| Caso | Resultado esperado |
|------|-------------------|
| QR claim válido (1ª vez) | `VALID` |
| Mismo QR claim | `ALREADY_USED` |
| Token incorrecto | `INVALID` |
| Descuento `CANCELLED` | `INACTIVE` |

Doc: [docs/gastro/GASTRO_DISCOUNT_QR.md](../gastro/GASTRO_DISCOUNT_QR.md). Unit payload: `pnpm --filter api run test:gastro-discount-qr`.

### Gastro Slice 7 (reviews + follows + alertas)

```bash
pnpm --filter api run smoke:reviews    # incluye rutas /gastro/reviews si hay credenciales
pnpm --filter api run smoke:notifications
pnpm e2e:notifications               # desde raíz del monorepo
```

Follows: `POST /me/gastro-follows` + preferencias. Alerta descuento: `FOLLOWED_GASTRO_NEW_DISCOUNT` al aprobar ticket (`admin` approve). Ver [docs/gastro/GASTRO_FOLLOWS_NOTIFICATIONS.md](../gastro/GASTRO_FOLLOWS_NOTIFICATIONS.md).

### Bloque Gastro/Hoteles V2 — cierre QA (Slice 9)

| Verificación | Comando / ruta | Notas |
|--------------|----------------|--------|
| Payload QR v1 | `pnpm --filter api run test:gastro-discount-qr` | Sin API; unit shared |
| Scanner descuento | `pnpm --filter api run test:gastro-discount-scan` | API `:3001` + `DEV_AUTH_ENABLED=true` o dev; idempotente (limpia validaciones del fixture) |
| Ticket puerta | `pnpm --filter api run test:door-scan` | Fixture tickets; deja datos |
| Reviews gastro | `smoke:reviews` + `SMOKE_GASTRO_EMAIL` opcional | Credenciales obligatorias |
| Hoteles Próximamente | Manual: `/hoteles`, `/categorias`, `/admin/categorias` | Sin smoke `hotel` |

Docs gastro: [GASTRO_DISCOUNT_QR.md](../gastro/GASTRO_DISCOUNT_QR.md), [GASTRO_FOLLOWS_NOTIFICATIONS.md](../gastro/GASTRO_FOLLOWS_NOTIFICATIONS.md). Auditoría cierre: [GASTRO_HOTELES_V2_AUDIT.md](../audits/GASTRO_HOTELES_V2_AUDIT.md) § Slice 9.

### E2E Hoteles (Slice 12)

| Comando | Credenciales |
|---------|----------------|
| `pnpm e2e:hotel` | `E2E_HOTEL_EMAIL` + `E2E_HOTEL_PASSWORD`; admin opcional `E2E_ADMIN_*` |
| `pnpm playwright test e2e/hotel.spec.ts -g "reglas públicas"` | Ninguna |

Doc: [docs/hotel/HOTEL_E2E.md](../hotel/HOTEL_E2E.md). Sin `demo:seed`; tests con skip si faltan env.

---

## Cleanup de artefactos smoke

Tras cada `smoke:*` (por defecto) se elimina:

- Usuarios `*@smoke.yo-te-invito.test`
- Notificaciones con `referenceKey` `e2e-demo:*`
- Reviews / B2B con marcador `[smoke-test]`

Manual:

```bash
pnpm --filter api run smoke:cleanup              # dry-run
pnpm --filter api run smoke:cleanup -- --confirm
```

---

## Test door-scan (`test:door-scan`)

No es un smoke npm con prefijo `smoke:` — script de fixture que **deja datos en BD**.

**Requisitos:** API con `DEV_AUTH_ENABLED=true`, migraciones.

```bash
pnpm --filter api run test:door-scan
```

Verifica: primer scan `OK` → ticket `USED`; segundo scan `ALREADY_USED`; métricas.

Implementación: `apps/api/scripts/test-door-scan.ts`.

---

## E2E Playwright (navegador)

| Comando | Spec principal |
|---------|----------------|
| `pnpm e2e:portal` | `e2e/user-portal.spec.ts`, `checkout.spec.ts` |
| `pnpm e2e:notifications` | `e2e/notifications.spec.ts` |
| `pnpm e2e` | Suite completa |
| `pnpm e2e:hotel` | `e2e/hotel.spec.ts` — vertical hoteles |
| `pnpm e2e:portal:ui` | UI mode portal |

### Variables E2E

| Variable | Requerido | Default |
|----------|-----------|---------|
| `E2E_USER_EMAIL` | **Sí** | — |
| `E2E_USER_PASSWORD` | **Sí** | — |
| `E2E_HOTEL_EMAIL` | Solo `e2e:hotel` | Usuario hotel ACTIVE + ubicación en ficha |
| `E2E_HOTEL_PASSWORD` | Solo `e2e:hotel` | |
| `E2E_ADMIN_EMAIL` | Opcional (`e2e:hotel` admin tab) | Default = `E2E_USER_EMAIL` |
| `E2E_ADMIN_PASSWORD` | Opcional | Default = `E2E_USER_PASSWORD` |
| `E2E_TENANT_ID` | No | Default `tenant-demo` |
| `E2E_API_BASE_URL` | No | `http://127.0.0.1:3001` |
| `PLAYWRIGHT_BASE_URL` | No | `http://localhost:3000` |
| `E2E_TENANT_ID` | No | `tenant-demo` |

`E2E_SEED=1` está **ignorado** (`e2e/global-setup.ts`).

Sin credenciales, los tests con login hacen **skip**.

```bash
E2E_USER_EMAIL=felipe.e.salom@gmail.com E2E_USER_PASSWORD=<pass> pnpm e2e:portal
```

### Cobertura portal (`e2e/user-portal.spec.ts`)

- Redirect `/me` → login
- Dashboard «Mi espacio»
- Redirects `/cuenta` → `/me`
- Sidebar: carrito, preferencias, actividad, cuenta

### Notificaciones E2E

```bash
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... pnpm e2e:notifications
```

Requiere migración `user_notifications`. Opcional seed admin: ver [USER_PORTAL_NOTIFICATIONS.md](./USER_PORTAL_NOTIFICATIONS.md).

### Smoke API vs E2E

| Tipo | Qué valida |
|------|------------|
| **Smoke** | Contrato HTTP REST |
| **E2E** | UI, navegación, integración NextAuth |

---

## Cuando hay muchos `skip`

Publicar en BD (desde portales o admin):

- Al menos un evento **con ticket types** (portal usuario).
- Evento **gastro** publicado (reviews).
- Cuentas con roles producer/gastro/referrer/admin si querés cobertura reviews completa.

Restaurar portales del maestro tras cleanup:

```bash
pnpm --filter api run user:restore-master
```

---

## Referencias en código

| Archivo | Uso |
|---------|-----|
| `apps/api/scripts/lib/smoke-auth.ts` | Login y registro smoke |
| `apps/api/scripts/lib/smoke-cleanup.ts` | Limpieza BD |
| `apps/api/scripts/lib/smoke-runner.ts` | Cleanup post-smoke |
| `e2e/helpers/env.ts` | Credenciales E2E |
| `e2e/global-setup.ts` | Health API; aviso `E2E_SEED` |
