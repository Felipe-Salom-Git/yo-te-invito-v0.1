# Revisión Login y Conectividad — Yo Te Invito

## Resumen de correcciones aplicadas

### 1. Auth / Login

- **producer-events-crud.service.ts**: Corregido error TypeScript en el filtro `status` (EventStatus vs string).
- **check-credentials**: Actualizado para llamar a la API cuando `NEXT_PUBLIC_USE_API=true`, permitiendo validar usuarios creados por la API (no solo demo).
- **login/page.tsx**: Obtiene el rol primero desde la sesión (tras signIn) y usa check-credentials como fallback.

### 2. Conectividad API ↔ Frontend

- **API login**: Verificado que `POST /auth/login` funciona correctamente con usuarios demo (admin, producer, gastro, user).
- **Smoke tests**: Actualizados para usar Bearer token (obtenido vía login) en lugar de X-Dev-User-Id, para que funcionen sin depender de NODE_ENV=development.

### 3. Prerrequisitos para que el login funcione

1. **API corriendo**: `pnpm dev:api` (o `pnpm dev` para todo)
2. **DB migrada y con seed**: `pnpm db:migrate` y `cd apps/api && pnpm run demo:seed`
3. **NEXTAUTH_SECRET en apps/web/.env**:
   ```env
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=<generar con: openssl rand -base64 32>
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
   NEXT_PUBLIC_USE_API=true
   ```

   Sin `NEXTAUTH_SECRET` aparecen errores como `JWT_SESSION_ERROR: decryption operation failed`.

### 4. Usuarios demo (contraseña: `demo`)

| Rol           | Email              | Dashboard  |
|---------------|--------------------|------------|
| ADMIN         | admin@demo.local   | /admin     |
| PRODUCER_OWNER| producer@demo.local| /producer  |
| GASTRO_OWNER  | gastro@demo.local  | /gastro    |
| USER          | user@demo.local    | /cuenta    |

### 5. Scripts de verificación

- **Login API**: `cd apps/api && pnpm exec tsx scripts/test-login-api.ts`
- **Smoke tests**: `cd apps/api && pnpm run smoke`
- **Demo seed**: `cd apps/api && pnpm run demo:seed`

### 6. Flujo de login (modo API)

1. Usuario ingresa email/password en `/login`
2. NextAuth `authorize` llama `POST /auth/login` en la API
3. Si OK, la API devuelve `{ token, user }`; NextAuth guarda en sesión JWT
4. Se obtiene el rol (sesión o check-credentials) para redirigir al dashboard
5. RepositoriesProvider usa `session.user.accessToken` para las llamadas API autenticadas
