# V3.3 Etapa 3 — Scanner V3 — Cierre técnico

**Fecha:** 2026-08-31  
**Rama:** `feat/v1-s03-api-foundation`  
**Estado:** COMPLETADA EN CÓDIGO — pendiente context update / push / QA manual global V3.3

---

## 1. Resumen

Etapa 3 entrega Scanner V3 con branding Yo Te Invito, códigos cortos manuales, acceso rápido a cámara y autenticación por username sin email obligatorio. El motor QR, scope, offline y compatibilidad legacy se mantienen.

| Slice | Commit | Mensaje |
|-------|--------|---------|
| 3.1 | `b05bdff` | `feat(v3.3): refresh scanner branding` |
| 3.2 | `476cad9` | `feat(v3.3): add scanner manual short codes` |
| 3.3 | `323dca8` | `feat(v3.3): streamline scanner camera flow` |
| 3.4 | `f4a5b4f` | `feat(v3.3): support scanner username authentication` |
| 3.5 | _(este commit)_ | `docs(v3.3): close scanner v3 stage` |

---

## 2. Branding

- **Nombre PWA:** `Yo Te Invito Scanner` / short `YT Scanner`
- **Manifest:** `apps/scanner/public/manifest.json` — fondo `#0a0a0a`, theme dark
- **Iconos:** SVG QR verde `#22c55e` + logo PNG en `apps/scanner/public/brand/logo.png` (copia deliberada desde web)
- **UI:** `ScannerBrandHeader`, tokens Tailwind `scanner-*`, login con estética dark premium
- **PWA:** manifest válido, build Next.js OK

---

## 3. Código corto

### Tickets

- Reutiliza `shortTicketCode(ticketId)` — últimos 8 alfanuméricos del ID (existente en PDF/listados).
- Resolución server-side en `ScannerShortCodeService.resolveTicketQrPayload` antes del scan normal.
- Util compartido: `packages/shared/src/scanner/manual-short-code.util.ts`.

### Gastro

- Nueva columna `GastroDiscountClaim.shortCode` (6 chars, charset sin ambiguos, global unique).
- Migración: `20260831120000_gastro_claim_short_code`.
- Generación en creación de claims (público + cortesía).
- Validación: lookup short code → `buildGastroDiscountQrPayload` → flujo QR existente.

### Normalización input

- Trim, quitar guiones/espacios, uppercase.
- `K7M-428` y `k7m428` equivalentes.

### Scope

- Tickets: resolución dentro del `eventId` del scan.
- Gastro: `assertScannerCanAccessGastroDiscount` antes de redimir.
- Short code conocido ≠ permiso automático.

### Offline

- **Tickets:** lookup por `code` en snapshot IndexedDB (`getTicketsForEvent` + resolve).
- **Gastro short code:** solo online (igual que QR gastro); mensaje explícito en UI.

---

## 4. Cámara rápida

- **1 target:** auto-entra a pantalla scan tras cargar targets.
- **Multi target:** selector obligatorio (sin auto-selección peligrosa).
- **Target persistido:** `scanner:screen=scan` + target válido → reabre scan.
- **Deep link:** `?mode=camera` fuerza modo cámara.
- **Setup CTAs:** «Escanear con cámara» / «Ingresar código manualmente».
- Cámara no auto-loop; control manual de escaneo preservado.

---

## 5. Username auth

Ver `docs/audits/V3_3_SCANNER_USERNAME_AUTH.md`.

- `User.username` nullable `@unique` global.
- `User.email` nullable (scanners nuevos sin email).
- Login: `identifier` o `email` legacy.
- Portal: crear con `username` + password.
- PWA: «Usuario o email» (compat legacy).
- Sin `emailVerified` falso para scanners; bypass de verificación **solo** `Role.SCANNER` (no `email == null` genérico).

---

## 6. Prisma / migraciones

| Migración | Cambio |
|-----------|--------|
| `20260831120000_gastro_claim_short_code` | `GastroDiscountClaim.shortCode` NOT NULL UNIQUE + backfill |
| `20260831130000_user_scanner_username` | `User.email` nullable, `User.username` nullable UNIQUE |

---

## 7. Compatibilidad legacy

- Scanners con email existentes: login por email sigue funcionando.
- QR tickets y gastro intactos.
- Offline snapshot/sync sin cambios de contrato (campo `code` ya existía).

---

## 8. Seguridad

- Short code no reemplaza QR seguro; solo lookup server-side.
- Sin emails ficticios.
- Password hashing sin cambios.
- Scope RBAC intacto.
- Gastro short code no amplía enumeración (respuestas genéricas INVALID).

---

## 9. Offline

- Ticket short code offline vía snapshot.
- Gastro short code requiere conexión.
- Sync queue sigue usando `qrPayload` resuelto.

---

## 10. Builds / tests

| Check | Resultado |
|-------|-----------|
| `pnpm --filter shared run build` | PASS |
| `pnpm --filter api run build` | PASS |
| `pnpm --filter scanner run build` | PASS |
| `pnpm --filter web run build` | PASS |
| `test:scanner-manual-short-code` | PASS |
| `test:scanner-username-auth` | PASS |
| `smoke:v31-scanner-accounts` | NO EJECUTADO (DB localhost:5433 no disponible) |
| `smoke:v31-scanner-scope` | NO EJECUTADO (DB no disponible) |

---

## 11. QA manual pendiente

Acumulado para cierre global V3.3:

### Mobile

- Instalar PWA, icono/nombre
- Login username, target, cámara, QR, resultado, siguiente scan

### PC

- Login username, short code ticket, Enter, errores (inválido / usado)

### Gastro

- QR descuento, short code, scope correcto/incorrecto

### Eventos

- Multi-fecha, short code, scanner incorrecto

### Legacy

- Scanner viejo con email login

---

## 12. Riesgos / deuda

- Colisión teórica de `shortTicketCode` (8 chars derivados de ID) en eventos muy grandes — mitigado por scope evento; ambigüedad → INVALID.
- `gen_random_bytes` en migración gastro (`20260831120000_gastro_claim_short_code`) incluye `CREATE EXTENSION IF NOT EXISTS pgcrypto` de forma idempotente.
- Smokes integración requieren DB local.
- Assets logo duplicados scanner/web (documentado).

---

## 13. Commits locales (Etapa 3)

```
b05bdff feat(v3.3): refresh scanner branding
476cad9 feat(v3.3): add scanner manual short codes
323dca8 feat(v3.3): streamline scanner camera flow
f4a5b4f feat(v3.3): support scanner username authentication
<hash>  docs(v3.3): close scanner v3 stage
```

---

## Archivos principales tocados

- `apps/scanner/` — branding, DoorScannerClient, login, offline
- `apps/api/src/scanner/` — short code resolution, gastro validate
- `apps/api/src/auth/auth.service.ts` — identifier login
- `apps/api/src/modules/scanner-accounts/` — username create
- `packages/shared/src/scanner/` — manual short code + username utils
- `apps/web/components/portal/scanner/ScannerUsersPanel.tsx`
