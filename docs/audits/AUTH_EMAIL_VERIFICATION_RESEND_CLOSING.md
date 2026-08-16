# Auth — Reenvío de email de validación (cierre)

**Fecha:** 2026-08-16
**Commit:** `fix(auth): allow resending expired verification emails`

## Problema

Si el link de `AUTH_VERIFY_EMAIL` vencía, el usuario quedaba bloqueado en login (`EMAIL_NOT_VERIFIED`) sin forma de pedir uno nuevo.

## Endpoint

```txt
POST /auth/resend-verification-email
{ "email": "usuario@example.com", "tenantId?": "tenant-demo" }
```

Respuesta siempre genérica (200):

```txt
Si la cuenta existe y necesita verificación, te enviaremos un nuevo email.
```

Excepto:

- `400` validación Zod (email inválido)
- `429` rate limit (`TOO_MANY_REQUESTS`)

## Comportamiento

| Caso | Token nuevo | Email | Respuesta |
|------|-------------|-------|-----------|
| Existe, no verificado | Sí (reemplaza el anterior) | `AUTH_VERIFY_EMAIL` | Genérica |
| Ya verificado | No | No | Genérica |
| Email inexistente | No | No | Genérica |

Registro y reenvío comparten `issueAndSendVerificationEmail` (mismo token 32 bytes hex, TTL **24 horas**, `getAppUrl()` + `/verify-email?token=`).

## Seguridad

- Email recortado y en minúsculas
- Token criptográfico (`crypto.randomBytes(32)`)
- Token anterior invalidado (`deleteMany` por `userId`)
- Token no incluido en la respuesta API
- Log: `userId` únicamente, nunca el token ni la URL
- Rate limit in-memory (sin Nest Throttler en el proyecto):
  - 3 solicitudes / 15 min por email
  - 10 solicitudes / 15 min por IP
- Reset al reiniciar el proceso (documentado; suficiente para abuso básico)
- Test Prisma opcional: si la DB no está, el script omite integración y cubre policy/util

## UX

- Login: si `EMAIL_NOT_VERIFIED`, botón **Reenviar email de validación** con el email ya ingresado
- Mensaje genérico + aviso de Spam
- `/verify-email`: enlace inválido/vencido/usado → copy unificado + CTA a `/login`

## Tests

```bash
pnpm --filter api run test:auth-resend-verification
```

Matriz: token nuevo ≠ anterior, anterior inválido, nuevo verifica, verified/unknown no envían email, respuesta genérica, rate limiter.

## Template

Reutilizado: `AUTH_VERIFY_EMAIL` (sin template nuevo).
