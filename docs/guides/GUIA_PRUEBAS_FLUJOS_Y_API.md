# Guía de pruebas — Flujos y API

Cómo probar el frontend contra la API real. Ver [DEMO_REMOVAL.md](./DEMO_REMOVAL.md).

---

## 1. Requisitos previos

- Node.js y pnpm
- PostgreSQL (`pnpm db:up`)
- `apps/web/.env` con `NEXT_PUBLIC_API_BASE_URL`, `NEXTAUTH_*` (ver [apps/web/.env.example](../../apps/web/.env.example))

---

## 2. Preparar entorno

```bash
pnpm db:up
pnpm db:migrate
```

**Usuarios:** registrarse en `/register` o usar cuenta existente (p. ej. `felipe.e.salom@gmail.com`). No ejecutar `demo:seed`.

Opcional — limpiar contenido de prueba sin borrar la cuenta maestra:

```bash
pnpm db:cleanup-content              # dry-run
pnpm db:cleanup-content -- --confirm
```

Login: NextAuth → `POST /auth/login` → JWT en `Authorization: Bearer`.

---

## 3. Levantar servicios

```bash
pnpm run -w dev
# o
pnpm dev:api && pnpm dev:web
```

---

## 4. Smoke tests (API)

```bash
pnpm --filter api run smoke:api
pnpm --filter api run smoke:api:user-portal
```

Variables:

- `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` — default `http://localhost:3001`
- `SMOKE_USER_EMAIL`, `SMOKE_USER_PASSWORD` — cuenta en BD
- `SMOKE_DEV_USER_ID` — fallback dev header (default `user-admin`)

---

## 5. Flujos a probar

Usar cuentas reales con el rol necesario (ver [DEVELOPER_USERS.md](./DEVELOPER_USERS.md)).

| Flujo | Rol típico | Pasos |
|-------|------------|--------|
| Home / explore | USER | `/home`, `/explore` |
| Detalle + compra | USER | Evento → checkout → **Pagar demo** → `/me/tickets` |
| Portal | USER | `/me`, carrito, favoritos, transferencias |
| Admin | ADMIN | `/admin/*` |
| Productor | PRODUCER_OWNER | `/producer/events` |
| Gastro | GASTRO_OWNER | `/gastro/*` |
| Scanner | SCANNER | `/dev/scanner-sim` o app scanner |

---

## 6. Probar API con curl

### Público

```bash
curl -s "http://localhost:3001/public/events?tenantId=tenant-demo&limit=5"
```

### Login JWT

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"felipe.e.salom@gmail.com","password":"<PASSWORD>","tenantId":"tenant-demo"}' \
  | jq -r '.token')

curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/me
```

### Dev header (solo desarrollo)

```bash
curl -s -H "X-Dev-User-Id: <user-uuid>" http://localhost:3001/me
```

El `user-uuid` debe existir en BD (no hay IDs fijos `user-admin` salvo que los hayas creado).

---

## 7. Pago demo (checkout)

1. Crear orden en checkout.
2. Crear pago con provider `DEMO`.
3. `POST /public/payments/:paymentId/demo-confirm`.
4. Ver ticket en `/me/tickets` con QR.

Integración Getnet real: [getnet-payment-integration.md](../modules/getnet-payment-integration.md).

---

## 8. Solución de problemas

| Problema | Solución |
|----------|----------|
| Login falla | Verificar usuario en BD; `reset-password.ts` si hace falta |
| 401 tras login | Token huérfano si el usuario fue borrado — volver a iniciar sesión |
| Sin eventos | Publicar desde productor/admin; no hay seed automático |
| Smoke skip | `SMOKE_USER_EMAIL` + eventos/tickets en BD |
| CORS | API debe aceptar origen `http://localhost:3000` |

---

## Referencias

- [DEVELOPER_USERS.md](./DEVELOPER_USERS.md)
- [SMOKE_TESTS_GUIDE.md](./SMOKE_TESTS_GUIDE.md)
- [DEVELOPER_SCRIPTS_GUIDE.md](./DEVELOPER_SCRIPTS_GUIDE.md)
- [DEMO_CURL_FLOW.md](./DEMO_CURL_FLOW.md)
