# Revisión login y conectividad

Ver [DEMO_REMOVAL.md](./DEMO_REMOVAL.md).

## Estado actual

- **Datos:** solo API (`ApiRepository` + PostgreSQL).
- **Login:** NextAuth Credentials → `POST /auth/login` en NestJS; JWT en sesión.
- **Sin** `demo-users`, `/dev/seed`, `NEXT_PUBLIC_USE_API` ni `check-credentials` en Next.js.

## Checklist local

1. PostgreSQL: `pnpm db:up && pnpm db:migrate`
2. API: `pnpm dev:api` → `http://localhost:3001/health`
3. Web `.env`: `NEXT_PUBLIC_API_BASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
4. Usuario en BD (registro o cuenta maestra)
5. Login en `/login` → redirección a `/profiles`

## Variables web

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>
```

## Flujo post-login

1. `signIn('credentials')` → `authorize` en `lib/auth/config.ts` → API login
2. JWT en sesión (`accessToken`, `userId`, `role`)
3. `router.push('/profiles')`

## JWT huérfano

Si el usuario fue eliminado de BD, el guard devuelve 401 — cerrar sesión y volver a entrar (no relacionado con seeds; ver cleanup solo con `db:cleanup-content`).

## Referencias

- [GUIA_PRUEBAS_FLUJOS_Y_API.md](./GUIA_PRUEBAS_FLUJOS_Y_API.md)
- [DEVELOPER_USERS.md](./DEVELOPER_USERS.md)
