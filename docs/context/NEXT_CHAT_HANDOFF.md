# Yo Te Invito — Next Chat Handoff

**Actualizado:** 2026-08-31 · Rama: `feat/v1-s03-api-foundation` · HEAD: ver `git log -1`

Punto de entrada operativo para **V3.3**. Detalle completo: `AI_ENTRYPOINT.md`, `PROJECT_CONTEXT.md`, `CONTEXT_PENDIENTES.md`.

---

## 1. Estado actual — V3.3

| Etapa | Estado |
|-------|--------|
| **Etapa 0 — Auditoría funcional/operativa** | ✅ Cerrada — `docs/audits/V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md` |
| **Etapa 1 — UX pública / mobile** | ✅ Código implementado (9 slices) |
| **Etapa 1 — QA manual** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 2 — Perfil usuario / Avatar** | ✅ Código implementado (4 slices) |
| **Etapa 2 — QA manual** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 3 — Scanner V3** | ✅ Código implementado (5 slices + auth hardening) |
| **Etapa 3 — QA manual / migración DB** | ⏳ Pendiente — acumulado cierre global V3.3 |
| **Etapa 4 — Gastro Multi-local + Approval** | ✅ Código implementado (6 slices + pre-cierre hardening) |
| **Etapa 4 — QA manual / DB smoke** | ⏳ Pendiente — acumulado cierre global V3.3 |

**Checklist V3.3:** `docs/dev/Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md`

**Próxima etapa V3.3:** **Etapa 5 — Descuentos Gastro V3**. No iniciar sin instrucción explícita.

---

## 2. Stack

| Capa | Tecnología |
|------|------------|
| Monorepo | pnpm + Nx |
| Web | Next.js 15 App Router, React, Tailwind, TanStack Query, NextAuth |
| API | NestJS, Prisma, PostgreSQL, Zod, BullMQ + Redis (emails) |
| Shared | `packages/shared` — schemas, enums, helpers |
| Scanner | PWA `apps/scanner` — **Yo Te Invito Scanner** |
| Auth | JWT + NextAuth; dev: `X-Dev-User-Id` |

---

## 3. Arquitectura

```txt
User → Next.js → ApiRepository → NestJS Controller → Service → Prisma → PostgreSQL
```

- **No** fetch directo desde componentes — usar repositories.
- Controllers: HTTP + Zod. Services: lógica. Prisma: persistencia.
- Tenant default público: `tenant-demo`.

---

## 4. Producción

| Componente | Detalle |
|------------|---------|
| VPS | Ubuntu DonWeb — SSH `deploy@…:5230` (`ssh yoteinvito`) |
| Procesos | systemd: `yti-web` (:3000), `yti-api` (:3001), `yti-scanner` (:3002) |
| Dominios | `yoteinvito.club`, `api.yoteinvito.club`, `scanner.yoteinvito.club` |

**Migraciones prod:** solo `npx prisma migrate deploy`. Incluye Etapa 3:
- `20260831120000_gastro_claim_short_code` (pgcrypto idempotente)
- `20260831130000_user_scanner_username`

Runbook: `docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`.

---

## 5. V3.3 Etapa 4 — commits principales

```txt
612fd2d docs(v3.3): design gastro multi-local architecture
f582517 feat(v3.3): support multiple gastro locations per account
3d7481d feat(v3.3): add multi-location gastro portal
d037b4c feat(v3.3): add gastro location approval workflow
4135e41 refactor(v3.3): scope gastro operations by location
6b0a96b docs(v3.3): close gastro multi-location stage
ea79aa6 fix(v3.3): harden gastro multi-location ownership
```

(+ commit documental de contextos tras este handoff)

---

## 6. Decisiones importantes (V3.3 Etapa 4 — Gastro Multi-local)

| Tema | Regla |
|------|-------|
| **Unidad operativa** | `GastroProfile` = propuesta/local público independiente (estado, publicación, ubicación, contactos, scanners, descuentos propios) |
| **Sin GastroOrganization** | No se introduce entidad organización ni ubicación física compartida — N memberships ya soportado |
| **N perfiles por cuenta** | `User` → N `UserGastroMembership` → N `GastroProfile` |
| **Approval** | Nuevo perfil (registro o local adicional) → `PENDING`; admin approve → `ACTIVE` + sync público; reject → `REJECTED` |
| **Portal con PENDING** | Usuario puede autenticarse y editar perfil PENDING; discovery/operación pública requiere ACTIVE |
| **Copy/snapshot** | `copyFromProfileId` prefill ubicación+contactos; **no** vincula permanentemente; imágenes/galería **no** se copian |
| **Ownership** | `GastroOwnershipService` — listar, assert, resolve create; tenant/membership server-side |
| **`?profileId=`** | Contexto de navegación portal (listado, crear, dashboard, scanners); **no** fuente de autorización |
| **Descuentos resource** | `discountId` → `GastroDiscount.gastroProfileId` → `assertCanOperateProfile` (hardening `ea79aa6`) |
| **Create discount** | 1 ACTIVE → auto-select; N ACTIVE → `profileId` obligatorio |
| **Scanner scope** | `ScannerAccount.parentProfileId` → `GastroProfile`; picker en portal si N perfiles |
| **Notificaciones approval** | Pendiente **A9** — workflow funciona sin delivery |
| **Nullable email** | `user-contact.util.ts`; display sin fake email; `requireUserEmail` donde obligatorio; skip delivery si null |

Doc: `V3_3_STAGE_4_GASTRO_MULTI_LOCAL_ARCHITECTURE.md`, `V3_3_STAGE_4_GASTRO_MULTI_LOCAL_CLOSING.md`.

---

## 7. V3.3 Etapa 3 — Scanner (referencia)

| Tema | Regla |
|------|-------|
| **Auth Scanner nuevo** | `User.username` global unique + password; `email: null` |
| **Bypass verification** | Solo `Role.SCANNER` (`198fc38`) |

Doc: `V3_3_STAGE_3_SCANNER_V3_CLOSING.md`.

---

## 8. V3.3 Etapa 2 — Avatar (referencia)

Doc: `V3_3_STAGE_2_USER_AVATAR_CLOSING.md`.

---

## 9. V3.3 Etapa 1 — UX pública (referencia)

Doc: `V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md`.

---

## 10. V3.2 — estado previo (sin cerrar QA)

Código slices 0–11 cerrado. Hotfixes 2026-08: `15f2776`, `b8dc571`, `ff6f8e0`, `920c5d7`.

**Pendiente V3.2:** deploy VPS + QA prod. **No sustituido por V3.3.**

---

## 11. Pendientes priorizados

1. **QA manual / integración global V3.3** — Etapas 1–4 acumuladas.
2. **Migración deploy + smoke DB** — `prisma migrate deploy`; smokes scanner.
3. **Notificaciones approval locales** — backlog **A9**.
4. **QA prod V3.2** — cache, roles, auth resend, horarios.
5. Deploy VPS si commits V3.2/V3.3 no están en prod.

Detalle: `CONTEXT_PENDIENTES.md`.

---

## 12. Comandos de validación

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter scanner run build
pnpm --filter web run build
pnpm --filter api run test:gastro-multi-local
pnpm --filter api run test:scanner-manual-short-code
pnpm --filter api run test:scanner-username-auth
```

---

## 13. Próximo paso recomendado

1. Iniciar **V3.3 Etapa 5 — Descuentos Gastro V3** cuando se indique.
2. QA manual + migración DB al cerrar V3.3 globalmente.
