# Eliminación de datos demo automáticos

**Regla vigente:** demo de **pago** sí (`POST /public/payments/:id/demo-confirm`, botón “Pagar demo” en checkout). Demo de **datos** no (sin seeds masivos ni usuarios `@demo.local` automáticos).

Documento de referencia tras las etapas 1–5 (marzo 2026).

---

## Qué se eliminó

| Área | Antes | Ahora |
|------|--------|--------|
| Scripts npm | `demo:seed`, `demo:seed-curated`, `demo:load` | **Eliminados** (archivos borrados en etapa 2) |
| Frontend dev | `/dev/seed`, `/dev/local-db` | **Rutas eliminadas** |
| Frontend datos | `lib/local-db/*`, `demo-users.ts`, rutas `/api/*` modo local | **Eliminados** (etapa 3) |
| E2E auto-seed | `E2E_SEED=1` → `demo:seed` | **Ignorado** con aviso en `e2e/global-setup.ts` |
| Login UI | Hints `user@demo.local` / `demo` | **Quitados** |
| Cleanup | `db:cleanup-demo` | **`db:cleanup-content`** (`prisma/scripts/cleanup-content.ts`) |

---

## Qué se conserva

| Herramienta | Comando | Uso |
|-------------|---------|-----|
| Cleanup seguro | `pnpm db:cleanup-content` | Dry-run por defecto; `--confirm` borra contenido del tenant preservando `felipe.e.salom@gmail.com` |
| Subcategorías | `pnpm --filter api run seed:subcategories` | Catálogo idempotente (sin usuarios/eventos) |
| Perfiles maestro | `pnpm --filter api run user:restore-master` | ADMIN + portales para cuenta preservada |
| Utilidades usuario | `user:inspect`, `user:reset-password`, `user:verify-email`, `user:test-login` | Ops vía `pnpm --filter api run user:*` |
| Cleanup smokes | `smoke:cleanup` | Borra `@smoke.yo-te-invito.test`, notif. `e2e-demo:*`, reviews `[smoke-test]` |
| Prisma seed opt-in | `pnpm db:seed` | Solo si `SEED_DEFAULT_TENANT`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` |
| Pago simulado | `demo-confirm` + provider DEMO en checkout | Flujo real sin cobro Getnet/MP |

---

## Desarrollo local recomendado

### 1. Infra y API

```bash
pnpm db:up
pnpm db:migrate
pnpm dev:api   # o pnpm run -w dev
```

### 2. Cuenta de trabajo

- Usar **`felipe.e.salom@gmail.com`** (u otra cuenta real registrada en la API).
- Registro: `/register` → `POST /auth/register` en la API.
- No ejecutar seeds destructivos ni `db:reset-dangerous` sin necesidad.

### 3. Web

`apps/web/.env`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>
```

La app usa **solo** `ApiRepository` + NextAuth contra `POST /auth/login`.

### 4. Limpiar contenido de prueba (opcional)

```bash
pnpm db:cleanup-content              # ver qué se borraría
pnpm db:cleanup-content -- --confirm # ejecutar (dev)
pnpm db:cleanup-content -- --confirm --make-preserved-user-admin
```

### 5. E2E / smokes

```bash
# Usuario existente en BD (no se auto-seedea)
E2E_USER_EMAIL=felipe.e.salom@gmail.com E2E_USER_PASSWORD=<tu-pass> pnpm e2e:portal

# Smoke API
SMOKE_USER_EMAIL=felipe.e.salom@gmail.com SMOKE_USER_PASSWORD=<pass> pnpm --filter api run smoke:user-portal
```

`E2E_SEED=1` ya no carga datos; se ignora.

---

## Documentación actualizada

Guías activas alineadas con este doc:

- [DEVELOPER_USERS.md](./DEVELOPER_USERS.md)
- [GUIA_PRUEBAS_FLUJOS_Y_API.md](./GUIA_PRUEBAS_FLUJOS_Y_API.md)
- [SMOKE_TESTS_GUIDE.md](./SMOKE_TESTS_GUIDE.md)
- [DEVELOPER_SCRIPTS_GUIDE.md](./DEVELOPER_SCRIPTS_GUIDE.md)
- [guides/README.md](./README.md)
- [REVISION_LOGIN_Y_CONECTIVIDAD.md](./REVISION_LOGIN_Y_CONECTIVIDAD.md)
- [DEMO_CURL_FLOW.md](./DEMO_CURL_FLOW.md)

Contexto (actualizado etapa E): `docs/context/AI_ENTRYPOINT.md`, `PROJECT_CONTEXT.md`, `BACKEND_CONTEXT.md`, `FRONTEND_CONTEXT.md`, `CONTEXT_PENDIENTES.md` § M, `docs/dev/SCRIPTS.md`.

---

## Docs históricos

Planes de ejecución y roadmaps que mencionan `LocalRepository`, `/dev/seed` o `demo:seed` son **referencia histórica**. Ver banner al inicio de cada archivo o este documento.
