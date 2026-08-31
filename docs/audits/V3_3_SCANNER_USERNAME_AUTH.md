# V3.3 — Scanner username authentication

**Etapa 3 · Slice 3.4** — Auditoría técnica y decisión de arquitectura.

## Decisión

**Opción A — `User.username` nullable + `User.email` nullable para scanners**

Se reutiliza el modelo `User` existente, JWT, guards y `ScannerAccount` sin duplicar auth.

## Por qué

- Un solo sistema de sesión (`POST /auth/login` → JWT).
- `SCANNER` sigue siendo el rol autenticado; audit logs mantienen `actorId`.
- No se generan emails ficticios (`scanner@fake.local` prohibido).
- Portales producer/gastro y PWA comparten `ScannerAccountsService`.

## Prisma

Migración `20260831130000_user_scanner_username`:

```prisma
email     String?   // nullable — scanners nuevos sin email
username  String?   @unique  // global unique, lowercase en app
```

`@@unique([tenantId, email])` se mantiene para usuarios con email.

## Username

- Reglas: 3–32 chars, `[a-zA-Z0-9._-]`.
- Normalización: `trim()` + `toLowerCase()` (`BarraScanner` === `barrascanner`).
- Unicidad: **global** (`User.username @unique`).

Util compartido: `packages/shared/src/scanner/scanner-username.util.ts`.

## Login

`authLoginRequestSchema` acepta:

- `identifier` (preferido) — username o email.
- `email` (legacy) — web pública sigue enviando email.

Resolución en `AuthService.login`:

1. Si contiene `@` → lookup por email (con `tenantId` opcional).
2. Si no → lookup por `username` normalizado.

## Email verification

Bypass **solo por rol Scanner** (y master user existente):

- `role === Role.SCANNER` → no requiere `emailVerified`
- `isMasterUser` → sin cambios

No se usa `email == null` como condición general de bypass (evita abrir login a cuentas no verificadas de otros roles).

No se setea `emailVerified` falso al crear scanner.

## Creación scanner (portal)

`createScannerUserBodySchema`:

- `username` (requerido)
- `password` (opcional — API puede generar temporal)
- `firstName` / `lastName` (opcionales; default desde username)

User creado con `email: null`, `username`, `role: SCANNER`.

## Compatibilidad legacy

Scanners existentes con email:

- Siguen existiendo con `email` + `username: null`.
- Login por email en PWA (`Usuario o email`) sigue funcionando.
- No se exige backfill de username.

## Seguridad

- Password hashing sin cambios (`hashPassword` / `verifyPassword`).
- Respuesta anti-enumeración: mensaje genérico de credenciales.
- Rate limiting existente en auth (sin debilitar).
- Scope scanner (`ScannerAccount`, `assertScannerCanAccess*`) intacto.

## Archivos principales

| Área | Archivo |
|------|---------|
| Prisma | `apps/api/prisma/schema.prisma` |
| Auth | `apps/api/src/auth/auth.service.ts` |
| Schemas | `packages/shared/src/schemas/user.schema.ts`, `scanner-accounts.ts` |
| Portal | `apps/web/components/portal/scanner/ScannerUsersPanel.tsx` |
| PWA | `apps/scanner/components/ScannerLoginForm.tsx` |
| Service | `apps/api/src/modules/scanner-accounts/scanner-accounts.service.ts` |

## Tests

- `pnpm --filter api run test:scanner-username-auth` — normalización/schema.
- Smokes existentes `smoke:v31-scanner-accounts` / `scope` — requieren DB; validar en CI/local.

## QA manual pendiente

- Crear scanner con username desde portal producer/gastro.
- Login PWA con username.
- Login legacy con email de scanner viejo.
- Usuario normal web sigue con email + verificación.
