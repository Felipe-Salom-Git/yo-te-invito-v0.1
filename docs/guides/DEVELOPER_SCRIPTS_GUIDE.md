# Guía de scripts developer — Yo Te Invito

Manual de bolsillo con los **comandos npm vigentes** para desarrollar y mantener el monorepo.

**Inventario técnico (IA):** [docs/dev/SCRIPTS.md](../dev/SCRIPTS.md)  
**Smokes y E2E:** [SMOKE_TESTS_GUIDE.md](./SMOKE_TESTS_GUIDE.md)  
**Índice de guías:** [README.md](./README.md)

---

## 1. Introducción

Esta guía lista los comandos developer **activos** después de la limpieza de datos demo automáticos.

| Regla | Significado |
|-------|-------------|
| **Pago demo sí** | Podés probar checkout, `demo-confirm`, emisión de tickets, QR y scanner sin cobro real |
| **Datos demo automáticos no** | No hay `demo:seed`, ni usuarios `@demo.local` por defecto, ni LocalDB |
| **Usuario maestro** | `felipe.e.salom@gmail.com` — **no** lo borra `db:cleanup-content` |
| **Fuente de verdad** | NestJS API + PostgreSQL; la web usa `ApiRepository` |

Contenido de prueba: cargar **manualmente** desde la cuenta principal y portales (admin, producer, gastro, etc.).

---

## 2. Comandos de desarrollo

### `pnpm dev`

Levanta **web** (`:3000`), **API** (`:3001`) y **scanner** (`:3002`) en modo desarrollo.

```bash
pnpm dev
```

| | |
|--|--|
| **Riesgo** | Bajo |
| **Toca DB** | No por sí solo |
| **Cuándo** | Trabajo diario full-stack |

### `pnpm dev:api` / `pnpm dev:web` / `pnpm dev:scanner`

Un solo servicio cada uno.

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:scanner
```

### `pnpm build` / `pnpm lint` / `pnpm test`

Build, typecheck (`tsc --noEmit`) y test placeholder del monorepo.

```bash
pnpm build
pnpm lint
pnpm test
```

---

## 3. Comandos de base de datos

### `pnpm db:up` / `pnpm db:down`

Inicia o detiene **PostgreSQL** en Docker.

```bash
pnpm db:up
pnpm db:down
```

**Riesgo:** bajo (infra).

### `pnpm db:generate`

Regenera el cliente Prisma tras cambiar `schema.prisma`.

```bash
pnpm db:generate
```

**No** aplica migraciones.

### `pnpm db:migrate`

Aplica migraciones en desarrollo (`prisma migrate dev`).

```bash
pnpm db:migrate
```

**Precaución:** modifica el schema de la BD local. **Solo desarrollo** — en producción VPS usar `cd apps/api && npx prisma migrate deploy` (ver [`DONWEB_PRODUCTION_RUNBOOK.md`](../deploy/DONWEB_PRODUCTION_RUNBOOK.md) §25). No usar `db:reset-dangerous` ni `db:cleanup-content` en prod salvo emergencia documentada.

### `pnpm db:studio`

Abre Prisma Studio para inspeccionar/editar datos manualmente.

```bash
pnpm db:studio
```

**Riesgo:** medio — edición manual directa en tablas.

### `pnpm db:cleanup-content`

Borra **contenido del tenant** (eventos, órdenes, perfiles, otros usuarios, etc.) y **preserva**:

- `felipe.e.salom@gmail.com`
- tenant y `PlatformConfig`
- subcategorías (salvo flag)

```bash
pnpm db:cleanup-content                    # dry-run: muestra qué se borraría
pnpm db:cleanup-content -- --confirm       # ejecutar
pnpm db:cleanup-content -- --confirm --make-preserved-user-admin
```

| | |
|--|--|
| **Riesgo** | Medio |
| **Protecciones** | Dry-run por defecto; bloqueado en `production` sin `ALLOW_PRODUCTION_CLEANUP=true` |

**No** vuelve a insertar datos demo.

### `pnpm db:reset-dangerous`

**Borra toda la base de datos** y re-aplica migraciones desde cero.

```bash
pnpm db:reset-dangerous -- --confirm
```

| | |
|--|--|
| **Riesgo** | **Alto** |
| **Protecciones** | Requiere `--confirm`; pausa 3 s; bloqueado en production sin `ALLOW_PRODUCTION_RESET=true` |
| **Nota** | **No** preserva Felipe ni contenido |

Preferir `db:cleanup-content` si solo querés vaciar contenido de prueba.

### `pnpm db:seed`

Seed **opt-in** de Prisma (`apps/api/prisma/seed.js`). Solo corre si definís:

```bash
SEED_DEFAULT_TENANT=true SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... pnpm db:seed
```

Crea tenant + admin explícito — **no** es el flujo habitual del proyecto.

**No existe** `db:seed-structure`. Para catálogo de subcategorías usar `seed:subcategories`.

---

## 4. Comandos de usuario maestro

Variables opcionales: `TEST_USER_EMAIL` (default Felipe), `TENANT_ID` (default `tenant-demo`).

### `pnpm --filter api run user:restore-master`

Restaura rol **ADMIN** y perfiles activos (producer, gastro, hotel, referrer) para el usuario maestro.

```bash
pnpm --filter api run user:restore-master
```

**Cuándo:** después de `db:cleanup-content` o si faltan portales en `/profiles`.

### `pnpm --filter api run user:inspect -- <email>`

Muestra usuario, verificación de email, estado del hash, token de verificación pendiente.

```bash
pnpm --filter api run user:inspect -- felipe.e.salom@gmail.com
pnpm --filter api run user:inspect -- felipe.e.salom@gmail.com --verify-password <pass>
```

Solo lectura (salvo que uses reset-password aparte).

### `pnpm --filter api run user:reset-password -- <email> <nuevaPass>`

Cambia la contraseña (scrypt) de un usuario **real**.

```bash
pnpm --filter api run user:reset-password -- felipe.e.salom@gmail.com <password>
```

### `pnpm --filter api run user:verify-email -- <email>`

Marca el email como verificado (bypass del link).

```bash
pnpm --filter api run user:verify-email -- felipe.e.salom@gmail.com
```

### `pnpm --filter api run user:test-login`

Prueba `POST /auth/login` contra la API en marcha.

```bash
SMOKE_USER_EMAIL=felipe.e.salom@gmail.com SMOKE_USER_PASSWORD=<pass> pnpm --filter api run user:test-login
```

---

## 5. Comandos de estructura (sin contenido demo)

### `pnpm --filter api run seed:subcategories`

Catálogo **idempotente** de subcategorías para `tenant-demo`.

```bash
pnpm --filter api run seed:subcategories
```

| | |
|--|--|
| **Crea** | Subcategorías (event, gastro, rental, excursion) |
| **No crea** | Usuarios, eventos, órdenes, tickets |

---

## 6. Smokes y tests

Detalle completo: [SMOKE_TESTS_GUIDE.md](./SMOKE_TESTS_GUIDE.md).

### Smokes seguros / bajo impacto

| Comando | Persiste en DB |
|---------|----------------|
| `smoke:api` | Casi no |
| `smoke:producer-follows` | Mínimo (follow se borra) |

### Smokes protegidos (credenciales + posible basura)

Requieren `SMOKE_USER_EMAIL` + `SMOKE_USER_PASSWORD`:

```bash
SMOKE_USER_EMAIL=felipe.e.salom@gmail.com SMOKE_USER_PASSWORD=<pass> pnpm --filter api run smoke:<nombre>
```

| Comando | Impacto típico |
|---------|----------------|
| `smoke:notifications` | Notificaciones `e2e-demo:*` |
| `smoke:reviews` | Reviews `[smoke-test]` |
| `smoke:referrals` | Propuestas, comisiones, solicitudes de pago (productor + referido) |
| `smoke:user-portal` | Órdenes, usuarios `@smoke.yo-te-invito.test`, transfers |
| `test:referral-proposals` / `test:referral-commission` / `test:referral-payment-requests` | Util Referidos V2 (sin BD) |

Cleanup automático al finalizar (configurable). Manual:

```bash
pnpm --filter api run smoke:cleanup -- --confirm
```

### Tests externos / fixture

| Comando | Notas |
|---------|--------|
| `test:getnet-auth` | OAuth Getnet; solo red |
| `test:door-scan` | **Alto** — deja fixture `door-scan-test-*` en BD |

### E2E Playwright

```bash
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... pnpm e2e:portal
E2E_USER_EMAIL=... E2E_USER_PASSWORD=... pnpm e2e:notifications
```

### One-shot migración

```bash
pnpm --filter api run migrate:user-portal-preferences        # dry-run
pnpm --filter api run migrate:user-portal-preferences -- --confirm
```

Migración histórica de preferencias JSON → tablas portal.

### Debug (solo desarrollo)

```bash
pnpm --filter api run debug:gastro-discounts
pnpm --filter api run debug:admin-api -- --profile-id <gastroProfileId>
```

---

## 7. Pago demo (producto — no es un script npm)

Flujo permitido para probar sin Getnet/Mercado Pago:

1. Checkout → orden `PENDING_PAYMENT`
2. Crear pago con provider **DEMO**
3. `POST /public/payments/:id/demo-confirm`
4. Tickets y QR en `/me/tickets`
5. Validación en scanner

Guía curl: [DEMO_CURL_FLOW.md](./DEMO_CURL_FLOW.md).

El smoke `smoke:user-portal` puede ejecutar este flujo si hay evento con entradas.

---

## 8. Comandos eliminados o no permitidos

| Antiguo | Estado |
|---------|--------|
| `demo:seed` | **Eliminado** — borraba usuarios no-admin |
| `demo:seed-curated` / `demo:load` | **Eliminado** — insertaba contenido demo masivo |
| `demo:seed-subcategories` | Renombrado → `seed:subcategories` |
| `demo:enable-test-user-profiles` | Renombrado → `user:restore-master` |
| `db:reset` | Renombrado → `db:reset-dangerous` |
| `db:cleanup-demo` | Renombrado → `db:cleanup-content` |
| `smoke` (sin sufijo) | Renombrado → `smoke:api` |
| `smoke:reviews-v2` | Renombrado → `smoke:reviews` |
| `/dev/seed`, `/dev/local-db` | Rutas web **eliminadas** |
| `lib/local-db`, `LocalRepository` | **Eliminados** del frontend |
| Usuarios `@demo.local` / password `demo` | **No** usar como default en smokes/E2E |
| `E2E_SEED=1` | **Ignorado** — ya no corre seeds |

Motivo: proteger `felipe.e.salom@gmail.com` y evitar repoblación accidental de datos demo.

---

## 9. Tabla rápida de riesgo

| Comando | Riesgo | Toca DB | Uso habitual |
|---------|--------|---------|--------------|
| `pnpm dev` | Bajo | No | Día a día |
| `db:generate` | Bajo | No | Tras cambiar schema |
| `db:up` / `db:down` | Bajo | Infra | Docker Postgres |
| `seed:subcategories` | Bajo | Sí (catálogo) | Entorno nuevo |
| `user:inspect` | Bajo | Lectura | Debug login |
| `user:test-login` | Bajo | No* | Probar auth API |
| `smoke:api` | Bajo | Casi no | Health API |
| `smoke:producer-follows` | Bajo | Mínimo | Follows |
| `test:getnet-auth` | Bajo | No | Integración Getnet |
| `db:migrate` | Medio | Schema | Nuevas migraciones |
| `db:studio` | Medio | RW manual | Inspección |
| `db:cleanup-content` | Medio | Sí | Limpiar contenido prueba |
| `user:restore-master` | Medio | Sí | Restaurar portales Felipe |
| `user:reset-password` | Medio | Sí | Recuperar acceso |
| `user:verify-email` | Medio | Sí | Bypass verificación |
| `db:seed` | Medio | Sí | Solo con env explícito |
| `smoke:reviews` | Medio | Sí | Contrato reviews |
| `smoke:notifications` | Medio | Sí | Notificaciones test |
| `smoke:cleanup` | Medio | Sí | Limpiar basura smokes |
| `smoke:user-portal` | Alto | Sí | Portal + demo-confirm |
| `test:door-scan` | Alto | Sí | Fixture escaneo |
| `db:reset-dangerous` | **Muy alto** | **Toda la BD** | Solo emergencia local |

\* HTTP a API.

---

## 10. Scripts ops VPS (producción — no npm)

Scripts shell en `scripts/ops/` para operaciones en el VPS DonWeb. **No** forman parte de `pnpm`; no ejecutar en Windows salvo prueba de sintaxis.

### `scripts/ops/backup-postgres-to-gcs.sh`

Backup PostgreSQL (`pg_dump` SQL plano + `gzip`) → Google Cloud Storage con checksum `sha256`.

```bash
# En VPS, como usuario deploy:
/opt/yoteinvito/scripts/ops/backup-postgres-to-gcs.sh \
  --env-file /opt/yoteinvito/.ops/backup-gcs.env \
  --dry-run

/opt/yoteinvito/scripts/ops/backup-postgres-to-gcs.sh \
  --env-file /opt/yoteinvito/.ops/backup-gcs.env
```

| | |
|--|--|
| **Riesgo** | Medio en prod (lectura completa BD; escribe objetos GCS) |
| **Toca DB** | Solo lectura (`pg_dump`) |
| **Secretos** | `.pgpass` + JSON SA **fuera del repo** |
| **Restore** | Solo vía restore drill documentado — **no** restaurar sobre `yo_te_invito` sin ventana |

Runbook completo: [`docs/deploy/GCS_BACKUPS_RUNBOOK.md`](../deploy/GCS_BACKUPS_RUNBOOK.md).

### `pnpm --filter api run smoke:storage-upload`

Sube imagen de prueba vía `POST /uploads/public-image` (requiere cuenta **ADMIN** y GCS configurado en API).

```bash
SMOKE_USER_EMAIL=felipe.e.salom@gmail.com SMOKE_USER_PASSWORD=<pass> \
  pnpm --filter api run smoke:storage-upload
```

| | |
|--|--|
| **Riesgo** | Medio (escribe objeto en bucket público) |
| **Toca DB** | No |
| **Env extra** | `GCS_PUBLIC_BUCKET` + credenciales en API; opcional `SMOKE_UPLOAD_FILE`, `SMOKE_SKIP_GCS_UPLOAD=1` |

Doc: [`GCS_STORAGE_STRATEGY.md`](../deploy/GCS_STORAGE_STRATEGY.md) §12–13.

---

## 11. Checklist antes de scripts peligrosos

Antes de `db:cleanup-content --confirm`, `db:reset-dangerous`, `smoke:user-portal` o `test:door-scan`:

- [ ] Estoy en la **base de datos correcta** (`DATABASE_URL` en `apps/api/.env`)
- [ ] **No** estoy en producción (o tengo el flag `ALLOW_*` solo si es intencional y entendido)
- [ ] Entiendo **qué filas se borran**
- [ ] Para cleanup: confirmé que **preserva** `felipe.e.salom@gmail.com`
- [ ] Tengo backup o acepto perder datos locales de prueba
- [ ] Para smokes: tengo `SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD` (no `@demo.local`)
- [ ] Sé si el smoke puede crear usuarios `@smoke.yo-te-invito.test` y que `smoke:cleanup` los quita

---

## Referencias

- [DEVELOPER_USERS.md](./DEVELOPER_USERS.md) — roles y rutas
- [DEMO_REMOVAL.md](./DEMO_REMOVAL.md) — política demo
- [GUIA_PRUEBAS_FLUJOS_Y_API.md](./GUIA_PRUEBAS_FLUJOS_Y_API.md) — flujos manuales
- [docs/deploy/GCS_BACKUPS_RUNBOOK.md](../deploy/GCS_BACKUPS_RUNBOOK.md) — backups PostgreSQL → GCS (VPS)
- [docs/context/AI_ENTRYPOINT.md](../context/AI_ENTRYPOINT.md) — entrada IA
