# Guía de usuarios y pruebas — Yo Te Invito

La aplicación usa **API + PostgreSQL** como única fuente de datos. No hay modo LocalStorage ni usuarios demo precargados automáticamente.

Ver también: [DEMO_REMOVAL.md](./DEMO_REMOVAL.md).

---

## Cuenta maestra preservada

El script de cleanup conserva siempre:

| Email | Uso |
|-------|-----|
| `felipe.e.salom@gmail.com` | Cuenta principal de desarrollo; no se borra con `db:cleanup-content` |

Restaurar perfiles de portales tras cleanup:

```bash
pnpm db:cleanup-content -- --confirm --make-preserved-user-admin
# o
pnpm --filter api run user:restore-master
```

---

## Crear usuarios para probar roles

1. **Registro web:** `/register` (comprador, productor, gastro, hotel, referrer según wizard).
2. **Admin API:** usuarios y roles vía panel `/admin/usuarios` (sesión ADMIN).
3. **Scripts:** `pnpm --filter api run user:inspect`, `user:reset-password`, `user:verify-email`, `user:test-login`.

No usar `demo:seed` ni `@demo.local` — esos scripts fueron eliminados.

---

## Rutas por rol (referencia)

| Rol | Rutas principales |
|-----|-------------------|
| **ADMIN** | `/admin`, `/admin/eventos`, `/admin/usuarios`, `/admin/aplicaciones`, `/admin/configuracion` |
| **PRODUCER_OWNER** | `/producer`, `/producer/events` |
| **GASTRO_OWNER** | `/gastro`, `/gastro/contenido`, `/gastro/descuentos` |
| **REFERRER** | `/referrer` |
| **USER** | `/home`, `/explore`, `/checkout`, `/me/*` |
| **SCANNER** | App scanner o `/dev/scanner-sim` (validación QR contra API) |

Redirección post-login: `/profiles` → elegir portal.

---

## Entorno local

```bash
pnpm db:up
pnpm db:migrate
pnpm run -w dev    # API :3001 + web :3000
```

`apps/web/.env`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generar con openssl rand -base64 32>
```

Login: NextAuth Credentials → `POST /auth/login` (JWT en sesión).

Guía de flujos: [GUIA_PRUEBAS_FLUJOS_Y_API.md](./GUIA_PRUEBAS_FLUJOS_Y_API.md).

---

## E2E (Playwright)

```bash
pnpm e2e:portal
pnpm e2e:notifications
pnpm e2e:ui
```

Requisitos: API en `:3001`, web en `:3000`, **usuario real en BD**:

```bash
E2E_USER_EMAIL=felipe.e.salom@gmail.com E2E_USER_PASSWORD=<password> pnpm e2e:portal
```

Detalle: [SMOKE_TESTS_GUIDE.md](./SMOKE_TESTS_GUIDE.md) (E2E). `E2E_SEED=1` está desactivado (no borra ni recrea datos).

---

## Pago demo (simulador)

Checkout con provider **DEMO**: crea pago y confirma vía `demo-confirm` sin Getnet/Mercado Pago. Ver [GUIA_PRUEBAS_FLUJOS_Y_API.md](./GUIA_PRUEBAS_FLUJOS_Y_API.md) y [getnet-payment-integration.md](../modules/getnet-payment-integration.md).

---

## Herramientas de mantenimiento

| Comando | Descripción |
|---------|-------------|
| `pnpm db:cleanup-content` | Dry-run: qué se borraría del tenant (preserva cuenta maestra) |
| `pnpm db:cleanup-content -- --confirm` | Ejecutar limpieza de contenido |
| `pnpm --filter api run seed:subcategories` | Catálogo de subcategorías (sin usuarios) |
| `pnpm --filter api run user:inspect -- <email>` | Inspeccionar cuenta |
| `pnpm --filter api run user:reset-password -- <email> <pass>` | Cambiar contraseña |
| `pnpm --filter api run user:verify-email -- <email>` | Verificar email manualmente |
| `pnpm --filter api run user:inspect -- <email>` | Ver cuenta y probar contraseña (`--verify-password`) |
| `pnpm --filter api run user:test-login` | Probar `POST /auth/login` con credenciales env |
| [DEVELOPER_SCRIPTS_GUIDE.md](./DEVELOPER_SCRIPTS_GUIDE.md) | Manual de comandos npm |
| [SMOKE_TESTS_GUIDE.md](./SMOKE_TESTS_GUIDE.md) | Smokes + E2E (`SMOKE_*`, `E2E_*`) |

---

## Roadmaps

- [ROADMAP_REGISTRO_AUTH_EMAIL.md](./ROADMAP_REGISTRO_AUTH_EMAIL.md)
- [ROADMAP_PENDIENTES_OPCIONALES.md](./ROADMAP_PENDIENTES_OPCIONALES.md)
- [CONFIG_GOOGLE_RESEND.md](./CONFIG_GOOGLE_RESEND.md)
