# Guía de pruebas — Flujos y API

Esta guía explica cómo probar el frontend contra la API real y cómo validar los flujos principales.

---

## 1. Requisitos previos

- Node.js y pnpm
- PostgreSQL (Docker: `pnpm db:up`)
- Variables de entorno configuradas (ver [apps/web/.env.example](../../apps/web/.env.example))

---

## 2. Preparar el entorno API

### 2.1 Base de datos

```bash
# Levantar PostgreSQL (si usas Docker)
pnpm db:up

# Aplicar migraciones
pnpm db:migrate

# Cargar datos demo (usuarios con password "demo", evento, tipos de entrada)
cd apps/api && pnpm run demo:seed
```

**Login:** Con USE_API=true, NextAuth llama a `POST /auth/login`; el token JWT se guarda y se envía en las peticiones.

### 2.2 Variables de entorno

En `apps/web/.env.local` (o `.env`):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_USE_API=true
```

---

## 3. Levantar servicios

```bash
# API (puerto 3001) + web (puerto 3000)
pnpm dev
```

O por separado:

```bash
pnpm dev:api   # API en 3001
pnpm dev:web   # Web en 3000
```

---

## 4. Smoke tests (API)

Para verificar que la API responde correctamente:

```bash
cd apps/api
pnpm run smoke
```

Comprueba: `events.list`, `events.getDetail`, `me`, `me/orders`, `me/tickets` con header `X-Dev-User-Id: user-admin`.

Variables opcionales:

- `API_BASE_URL` o `NEXT_PUBLIC_API_BASE_URL` — URL de la API (default: http://localhost:3001)
- `SMOKE_DEV_USER_ID` — ID de usuario para auth (default: user-admin)

---

## 5. Flujos a probar

Usuarios demo (ver [DEVELOPER_USERS.md](./DEVELOPER_USERS.md)) — contraseña: `demo`.

| Flujo | Usuario | Rutas / pasos |
|-------|---------|----------------|
| **Home y listado** | Cualquiera | `/home`, `/explore` — ver eventos |
| **Detalle evento** | Cualquiera | `/events/[id]` — ver evento, tipos de entrada |
| **Checkout y compra** | `user@demo.local` | `/checkout` → agregar al carrito → crear orden → `/checkout/success` → "Pay DEMO" |
| **Mis tickets** | `user@demo.local` | `/me/tickets` — ver tickets tras compra |
| **Mis órdenes** | `user@demo.local` | `/me/orders` |
| **Admin** | `admin@demo.local` | `/admin`, `/admin/eventos`, `/admin/usuarios`, `/admin/payouts` |
| **Producer** | `producer@demo.local` | `/producer`, `/producer/events`, crear evento, agregar ticket types |
| **Gastro** | `gastro@demo.local` | `/gastro`, `/gastro/contenido`, `/gastro/descuentos` |
| **Referrer** | `referrer@demo.local` | `/referrer`, `/referrer/eventos/[id]` |
| **Scanner** | `scanner@demo.local` | `/dev/scanner-sim` — validar QR de un ticket |

---

## 6. Probar API con curl

### Auth (X-Dev-User-Id en desarrollo)

```bash
# Listar eventos
curl -s "http://localhost:3001/public/events?tenantId=tenant-demo&limit=5"

# Perfil del usuario autenticado
curl -s -H "X-Dev-User-Id: user-admin" http://localhost:3001/me

# Órdenes del comprador
curl -s -H "X-Dev-User-Id: user-buyer" http://localhost:3001/me/orders
```

### Login real (JWT)

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.local","password":"demo"}' \
  | jq -r '.token')

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/me
```

---

## 7. Conmutar entre Local y API

| Variable | Comportamiento |
|----------|----------------|
| `NEXT_PUBLIC_USE_API=false` | LocalRepository (IndexedDB) — no requiere API |
| `NEXT_PUBLIC_USE_API=true` | ApiRepository — requiere API en ejecución |

Para modo LocalStorage:

1. En `.env.local`: `NEXT_PUBLIC_USE_API=false`
2. Ir a `/dev/seed` y ejecutar "Seed demo data"
3. Iniciar sesión y probar flujos

Para modo API:

1. Configurar BD, migraciones y demo-seed (ver §2)
2. En `.env.local`: `NEXT_PUBLIC_USE_API=true`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:3001`
3. Levantar API y web
4. Iniciar sesión con los mismos usuarios (NextAuth usa demo-users; el userId se envía como `X-Dev-User-Id`)

---

## 8. Solución de problemas

| Problema | Solución |
|----------|----------|
| "User not found" con X-Dev-User-Id | Ejecutar `pnpm run demo:seed` en `apps/api`. Si la DB ya tenía usuarios con UUID, hacer `pnpm db:reset` y luego `pnpm run demo:seed` para obtener ids: user-admin, user-producer, etc. |
| CORS | Verificar que la API acepte el origen del frontend (p. ej. http://localhost:3000) |
| Smoke tests fallan | Comprobar que la API está en ejecución y que la BD tiene el demo-seed aplicado |
| Eventos vacíos | El demo-seed crea un evento "Demo Concert". Si no aparece, verificar tenantId=tenant-demo |
