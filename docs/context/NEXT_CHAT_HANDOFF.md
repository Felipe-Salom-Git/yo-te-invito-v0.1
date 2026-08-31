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

**Checklist V3.3:** `docs/dev/Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md`

**Próxima etapa V3.3:** **Etapa 3 — Scanner V3**. No iniciar sin instrucción explícita.

---

## 2. Stack

| Capa | Tecnología |
|------|------------|
| Monorepo | pnpm + Nx |
| Web | Next.js 15 App Router, React, Tailwind, TanStack Query, NextAuth |
| API | NestJS, Prisma, PostgreSQL, Zod, BullMQ + Redis (emails) |
| Shared | `packages/shared` — schemas, enums, helpers |
| Scanner | PWA `apps/scanner` |
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

**Migraciones prod:** solo `npx prisma migrate deploy`.

Runbook: `docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`.

---

## 5. V3.3 Etapa 2 — commits principales

```txt
4142d5e docs(v3.3): audit user avatar flow
1bdb907 feat(v3.3): add user avatar upload
105696c feat(v3.3): surface user avatars across profile ui
b56599b docs(v3.3): close user avatar stage
```

(+ commit documental de cierre de contextos tras este handoff)

---

## 6. Decisiones importantes (V3.3 Etapa 2 — Avatar)

| Tema | Regla |
|------|-------|
| **Persistencia** | `User.preferences.avatarUrl` — **no** columna Prisma; **no** mezclar con `ReferrerProfile.avatarUrl` |
| **Upload** | `POST /uploads/public-image` — scope `user`, `entityId=userId`, `purpose=profile` |
| **Path GCS** | `public/users/{userId}/profile/{yyyy}/{mm}/{uuid}.{ext}` |
| **Validación** | URL HTTP(S) ≤2048; data URLs rechazadas; lectura con `readUserAvatarUrl()` |
| **UI gestión** | `/me/account` → `MeAccountAvatarSection` (cambiar / quitar foto) |
| **UI display** | `UserReviewerAvatar` en navbar, reviews, `/users/[userId]` |
| **Reemplazo** | Nuevo objeto GCS + PATCH; asset anterior **no** se borra (deuda orphan cleanup) |
| **Sin cropper** | `object-fit: cover`; hint 1080×1080 |

---

## 7. V3.3 Etapa 1 — decisiones (referencia)

| Tema | Regla |
|------|-------|
| **Rails subcategoría** | Carrusel dedicado solo con **≥5** publicaciones públicas válidas |
| **Autoplay** | **No** — navegación horizontal manual |
| **Cards descuento** | Click → ficha gastro; `/descuentos/[id]` se conserva (claim/QR/email) |
| **Actividades** | Label público **Actividades**; clave técnica **`excursion`** sin cambios |

---

## 8. V3.2 — estado previo (sin cerrar QA)

Código slices 0–11 cerrado. Hotfixes 2026-08: `15f2776` (cache), `b8dc571` (roles), `ff6f8e0` (auth resend), `920c5d7` (horarios overnight).

**Pendiente V3.2:** deploy VPS + QA prod de hotfixes + QA browser (`V3_2_QA_CLOSING.md`). **No sustituido por V3.3.**

---

## 9. Pendientes priorizados

1. **QA manual global V3.3** — Etapas 1 + 2 acumuladas (mobile 360/390/430, avatar upload/reload/navbar/reviews).
2. **QA prod V3.2** — cache, roles, auth resend, horarios (deuda anterior).
3. Deploy VPS si commits V3.2/V3.3 no están en prod.
4. Publicar términos comerciales en `/admin/legales`.
5. Ticketera real — nueva pasarela TBD.

Detalle: `CONTEXT_PENDIENTES.md`.

---

## 10. Comandos de validación

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build
```

---

## 11. Próximo paso recomendado

1. Iniciar **V3.3 Etapa 3 — Scanner V3** cuando se indique.
2. QA manual global V3.3 al cerrar todas las etapas planificadas.
