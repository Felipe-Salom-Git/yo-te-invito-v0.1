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

**Checklist V3.3:** `docs/dev/Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md`

**Próxima etapa V3.3:** **Etapa 4 — Gastro Multi-local + Aprobación**. No iniciar sin instrucción explícita.

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

## 5. V3.3 Etapa 3 — commits principales

```txt
b05bdff feat(v3.3): refresh scanner branding
476cad9 feat(v3.3): add scanner manual short codes
323dca8 feat(v3.3): streamline scanner camera flow
f4a5b4f feat(v3.3): support scanner username authentication
621c31a docs(v3.3): close scanner v3 stage
198fc38 fix(v3.3): harden scanner username authentication
```

(+ commit documental de contextos tras este handoff)

---

## 6. Decisiones importantes (V3.3 Etapa 3 — Scanner V3)

| Tema | Regla |
|------|-------|
| **Branding PWA** | Nombre **Yo Te Invito Scanner** / short **YT Scanner**; manifest dark `#0a0a0a`; logo duplicado en `apps/scanner/public/brand/` (deliberado PWA) |
| **Short code ≠ QR** | Lookup server-side → recurso real → misma validación y scope que QR |
| **Tickets short code** | `shortTicketCode` — 8 chars alfanuméricos; offline vía snapshot |
| **Gastro short code** | `GastroDiscountClaim.shortCode` — 6 chars, display `XXX-XXX`; **solo online** |
| **Auth Scanner nuevo** | `User.username` global unique + password; `email: null` |
| **Auth Scanner legacy** | Login por email sigue compatible (`identifier` o campo `email`) |
| **Email verification** | Bypass **solo** `Role.SCANNER` (+ master user); **no** `email == null` genérico (`198fc38`) |
| **User.email nullable** | A nivel DB; registro público/comercial sigue exigiendo email por schema |
| **Cámara rápida** | 1 target → scan directo; target persistido válido → reabre scan; `?mode=camera` |
| **Arquitectura auth** | `User.username` en lugar de auth duplicada en `ScannerAccount` — reutiliza JWT/guards |

---

## 7. V3.3 Etapa 2 — Avatar (referencia)

| Tema | Regla |
|------|-------|
| **Persistencia** | `User.preferences.avatarUrl` — **no** columna Prisma |
| **Upload** | `POST /uploads/public-image` — scope `user`, `purpose=profile` |

Doc: `V3_3_STAGE_2_USER_AVATAR_CLOSING.md`.

---

## 8. V3.3 Etapa 1 — UX pública (referencia)

Rails subcategoría **≥5** sin autoplay; cards descuento → ficha gastro; copy **Actividades**.

Doc: `V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md`.

---

## 9. V3.2 — estado previo (sin cerrar QA)

Código slices 0–11 cerrado. Hotfixes 2026-08: `15f2776`, `b8dc571`, `ff6f8e0`, `920c5d7`.

**Pendiente V3.2:** deploy VPS + QA prod. **No sustituido por V3.3.**

---

## 10. Pendientes priorizados

1. **QA manual / integración global V3.3** — Etapas 1 + 2 + 3 acumuladas.
2. **Migración deploy + smoke DB** — `prisma migrate deploy`; `smoke:v31-scanner-accounts`, `smoke:v31-scanner-scope`.
3. **QA prod V3.2** — cache, roles, auth resend, horarios.
4. Deploy VPS si commits V3.2/V3.3 no están en prod.
5. Publicar términos comerciales en `/admin/legales`.

Detalle: `CONTEXT_PENDIENTES.md`.

---

## 11. Comandos de validación

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter scanner run build
pnpm --filter web run build
pnpm --filter api run test:scanner-manual-short-code
pnpm --filter api run test:scanner-username-auth
```

---

## 12. Próximo paso recomendado

1. Iniciar **V3.3 Etapa 4 — Gastro Multi-local + Aprobación** cuando se indique.
2. QA manual + migración DB al cerrar V3.3 globalmente.
