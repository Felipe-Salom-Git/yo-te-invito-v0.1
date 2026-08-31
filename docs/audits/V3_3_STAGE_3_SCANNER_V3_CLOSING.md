# V3.3 Etapa 3 — Scanner V3 — Cierre técnico

**Fecha:** 2026-08-31  
**Rama:** `feat/v1-s03-api-foundation`  
**Estado:** CERRADA — código ✅ · contextos ✅ · push ✅ · migración DB smoke ⏳ · QA manual ⏳ global V3.3

---

## 1. Resumen

Etapa 3 entrega Scanner V3 con branding Yo Te Invito, códigos cortos manuales, acceso rápido a cámara y autenticación por username sin email obligatorio. El motor QR, scope, offline y compatibilidad legacy se mantienen.

| Slice | Commit | Mensaje |
|-------|--------|---------|
| 3.1 | `b05bdff` | `feat(v3.3): refresh scanner branding` |
| 3.2 | `476cad9` | `feat(v3.3): add scanner manual short codes` |
| 3.3 | `323dca8` | `feat(v3.3): streamline scanner camera flow` |
| 3.4 | `f4a5b4f` | `feat(v3.3): support scanner username authentication` |
| 3.5 | `621c31a` | `docs(v3.3): close scanner v3 stage` |
| Hardening | `198fc38` | `fix(v3.3): harden scanner username authentication` |
| Contextos | _(post-cierre)_ | `docs(v3.3): update context after scanner v3 stage` |

---

## 2. Branding

- **Nombre PWA:** `Yo Te Invito Scanner` / short `YT Scanner`
- **Manifest:** `apps/scanner/public/manifest.json` — fondo `#0a0a0a`, standalone, start `/door`
- **Iconos:** SVG QR verde `#22c55e` + logo PNG en `apps/scanner/public/brand/logo.png`
- **Duplicación logo:** copia deliberada desde `apps/web` por necesidades PWA — no es deuda funcional
- **UI:** `ScannerBrandHeader`, tokens Tailwind `scanner-*`, login dark premium

---

## 3. Código corto

### Regla arquitectónica

```txt
short code ≠ token QR
```

```txt
short code → resolución backend → recurso real → misma validación y scope del QR
```

### Tickets

- Reutiliza `shortTicketCode(ticketId)` — **8 caracteres alfanuméricos** (ej. `AB12CD34`)
- Resolución: `ScannerShortCodeService.resolveTicketQrPayload` antes del scan normal
- Util: `packages/shared/src/scanner/manual-short-code.util.ts`

### Gastro

- Columna `GastroDiscountClaim.shortCode` — **6 caracteres**, display `XXX-XXX` (ej. `K7M-428`)
- Lookup → `buildGastroDiscountQrPayload` → flujo QR existente

### Normalización

- trim, quitar separadores/espacios, uppercase (`K7M-428` = `k7m428`)

### Offline

- **Tickets:** compatible con snapshot/offline existente
- **Gastro:** requiere conexión — limitación conocida V3.3, no bug

---

## 4. Cámara rápida

- **1 target** → entrada directa a scan
- **Varios targets** → selector obligatorio
- **Target persistido + válido** → reabre scan
- **Target inválido** → vuelve a setup
- **Deep link:** `?mode=camera`
- CTAs: «Escanear con cámara» / «Ingresar código manualmente»
- Sin auto-loop de cámara

---

## 5. Username auth

Arquitectura elegida: **`User.username`** (no auth duplicada en `ScannerAccount`).

Motivo: reutilizar JWT, guards, audit actor, hashing; evitar emails ficticios.

Ver `docs/audits/V3_3_SCANNER_USERNAME_AUTH.md`.

### Modelo

| Campo | Regla |
|-------|-------|
| `User.email` | Nullable en DB; obligatorio en registro público/comercial |
| `User.username` | Nullable; global unique; lowercase al persistir |

| Tipo cuenta | email | username |
|-------------|-------|----------|
| Usuario normal | obligatorio (schema) | null |
| Scanner nuevo | null | obligatorio |
| Scanner legacy | existente | null (sin backfill) |

### Login

- Scanner nuevo: `username` + password
- Scanner legacy: `email` + password
- Auth: `identifier` o `email` (web comercial sigue con email)

### Email verification (hardening `198fc38`)

```txt
role === Role.SCANNER → no requiere emailVerified
```

(+ master user existente)

**NO** usar `email == null` como bypass genérico.

### Nullable email — correcciones

- `isProtectedMasterEmail` acepta null
- Admin list: `email ?? ''` para scanners sin email
- Deep-delete preflight: fallback label nombre/id

---

## 6. Prisma / migraciones

| Migración | Cambio |
|-----------|--------|
| `20260831120000_gastro_claim_short_code` | `GastroDiscountClaim.shortCode` + backfill; `CREATE EXTENSION IF NOT EXISTS pgcrypto` |
| `20260831130000_user_scanner_username` | `User.email` nullable; `User.username` UNIQUE |

### Estado migración local

```txt
NO EJECUTADA
```

Motivo: Docker Desktop / PostgreSQL local no disponible (2026-08-31).

Pendiente: `prisma migrate deploy` + smokes integración en entorno con DB.

---

## 7. Compatibilidad legacy

- Scanners con email: login por email funciona
- QR tickets y gastro intactos
- Offline snapshot/sync sin cambio de contrato

---

## 8. Seguridad

- Short code no reemplaza QR; lookup server-side con scope
- Sin emails ficticios
- Password hashing sin cambios
- Scope RBAC intacto

---

## 9. Builds / tests

| Check | Resultado |
|-------|-----------|
| `shared build` | PASS |
| `api build` | PASS |
| `scanner build` | PASS |
| `web build` | PASS |
| `test:scanner-manual-short-code` | PASS |
| `test:scanner-username-auth` | PASS |
| `smoke:v31-scanner-accounts` | NO EJECUTADO (DB no disponible) |
| `smoke:v31-scanner-scope` | NO EJECUTADO (DB no disponible) |

---

## 10. Estado cierre documental

| Ítem | Estado |
|------|--------|
| Código | ✅ |
| Auth hardening | ✅ |
| Builds | ✅ |
| Unit tests | ✅ |
| Contextos | ✅ |
| Checklist | ✅ |
| Push | ✅ (post-commit documental) |
| Migration DB smoke | ⏳ |
| Manual QA | ⏳ global V3.3 |

---

## 11. QA manual pendiente

Postergado deliberadamente para cierre global V3.3:

- PWA mobile: install, branding, username, cámara, QR
- PC: short code, Enter, errores
- Gastro: QR + short code, scope
- Eventos: multi-fecha, offline tickets
- Legacy: login email scanner viejo

---

## 12. Commits Etapa 3

```
b05bdff feat(v3.3): refresh scanner branding
476cad9 feat(v3.3): add scanner manual short codes
323dca8 feat(v3.3): streamline scanner camera flow
f4a5b4f feat(v3.3): support scanner username authentication
621c31a docs(v3.3): close scanner v3 stage
198fc38 fix(v3.3): harden scanner username authentication
```

---

## Archivos principales

- `apps/scanner/` — branding, DoorScannerClient, login, offline
- `apps/api/src/scanner/scanner-short-code.service.ts`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/modules/scanner-accounts/scanner-accounts.service.ts`
- `packages/shared/src/scanner/`
- `apps/web/components/portal/scanner/ScannerUsersPanel.tsx`
