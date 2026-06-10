# V3.1 Etapa 5 — Slice 5.1 — Scanner account ownership smoke

## Objetivo

Validar modelo `ScannerAccount`, servicio de ownership y endpoints de listado por cuenta padre.

## Decisión de modelo

**Opción B — tabla `ScannerAccount`** (no campos en `User`, no reutilizar `UserProducerMembership`).

Motivo: un usuario con membership STAFF heredaría acceso al portal productor vía `ProducerRolesGuard`; el scanner debe quedar aislado con rol `SCANNER` + vínculo dedicado.

Campos clave:

- `scannerUserId` — único (un scanner → una cuenta padre).
- `parentProfileType` — `PRODUCER | GASTRO | EXCURSION_OPERATOR | RENTAL_LOCATION`.
- `parentProfileId` — perfil comercial.
- `parentUserId` — usuario que creó/gestiona el vínculo.
- `isActive` — activación del vínculo (Slice 5.2).

## Migración

`apps/api/prisma/migrations/20260616120000_scanner_accounts/`

## Endpoints (Slice 5.1)

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/producer/scanners` | Productora | Lista scanners de perfiles productora gestionados |
| GET | `/gastro/scanners` | Gastro | Lista scanners del perfil gastro |
| GET | `/admin/scanner-accounts` | Admin | Lista con filtros opcionales |
| POST | `/admin/scanner-accounts` | Admin | Vincula usuario SCANNER existente (QA; portal en 5.2) |
| GET | `/scanner/account` | SCANNER | Contexto de cuenta padre del scanner autenticado |

## Comando

```bash
pnpm --filter shared run build
cd apps/api && npx prisma generate
cd apps/api && npx prisma migrate deploy
pnpm --filter api run smoke:v31-scanner-accounts
```

## Checks

| Check | Esperado |
|-------|----------|
| Tabla `ScannerAccount` | Existe post-migración |
| Unique `scannerUserId` | Un scanner → un padre |
| Link admin | SCANNER + perfil activo |
| Duplicado | 409 Conflict |
| `GET /producer/scanners` | Incluye scanner vinculado |
| Usuario USER | Forbidden en listado productora |
| `getActiveAccountForScanner` | Resuelve parent profile |

## Slice 5.2 (completado)

Ver `docs/audits/V3_1_STAGE_5_SCANNER_USERS_SMOKE.md`.

- Crear usuario scanner desde portales productora/gastro.
- Activar/desactivar y reset password.
- UI: `/producer/scanners`, `/gastro/scanners`.

## Pendiente

- Operador excursión (sin portal propio hoy).
- Slice 5.3+: PWA install CTA, cámara, scope.
