# Yo Te Invito — Next Chat Handoff

**Actualizado:** 2026-08-31 · Rama: `feat/v1-s03-api-foundation` · HEAD: `b01c31f` (+ commit documental de cierre)

Punto de entrada operativo para **V3.3**. Detalle completo: `AI_ENTRYPOINT.md`, `PROJECT_CONTEXT.md`, `CONTEXT_PENDIENTES.md`.

---

## 1. Estado actual — V3.3

| Etapa | Estado |
|-------|--------|
| **Etapa 0 — Auditoría funcional/operativa** | ✅ Cerrada — `docs/audits/V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md` |
| **Etapa 1 — UX pública / mobile** | ✅ Código implementado (9 slices) |
| **Etapa 1 — QA manual** | ⏳ Pendiente — `docs/audits/V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md` §7 |

**Checklist V3.3:** `docs/dev/Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md`

**Próxima etapa V3.3:** **Etapa 2 — Perfil usuario / Avatar** (A2 del backlog). No iniciar sin instrucción explícita.

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

## 5. V3.3 Etapa 1 — commits principales

```txt
061e052 feat(v3.3): route discount cards to gastro locations
20a3b52 feat(v3.3): improve mobile public navigation
3d0fa69 fix(v3.3): center dialogs across mobile layouts
d6be6f2 fix(v3.3): improve mobile image scrolling
bbc8956 feat(v3.3): add thresholded subcategory rails
1ea1d56 refactor(v3.3): improve gastro public action hierarchy
67ebfe4 feat(v3.3): improve public sharing metadata
c2883b6 feat(v3.3): rename excursions to activities in public ui
b01c31f docs(v3.3): close public mobile ux stage
```

---

## 6. Decisiones importantes (V3.3 Etapa 1)

| Tema | Regla |
|------|-------|
| **Rails subcategoría** | Carrusel dedicado solo con **≥5** publicaciones públicas válidas |
| **Autoplay** | **No** — navegación horizontal manual |
| **Cards descuento** | Click → ficha gastro; `/descuentos/[id]` se conserva (claim/QR/email) |
| **Actividades** | Label público **Actividades**; clave técnica **`excursion`** sin cambios |
| **Rutas legacy** | `/excursiones/*`, `/categoria/excursion` sin renombrar |

Fuente copy Actividades: `apps/web/lib/categories/excursionPublicCopy.ts`

---

## 7. V3.2 — estado previo (sin cerrar QA)

Código slices 0–11 cerrado. Hotfixes 2026-08: `15f2776` (cache), `b8dc571` (roles), `ff6f8e0` (auth resend), `920c5d7` (horarios overnight).

**Pendiente V3.2:** deploy VPS + QA prod de hotfixes + QA browser (`V3_2_QA_CLOSING.md`). **No sustituido por V3.3.**

---

## 8. Pendientes priorizados

1. **QA manual Etapa 1 V3.3** — mobile 360/390/430px + desktop + sharing OG/WhatsApp.
2. **QA prod V3.2** — cache, roles, auth resend, horarios (deuda anterior).
3. Deploy VPS si commits V3.2/V3.3 no están en prod.
4. Publicar términos comerciales en `/admin/legales`.
5. Ticketera real — nueva pasarela TBD.

Detalle: `CONTEXT_PENDIENTES.md`.

---

## 9. Comandos de validación

```bash
pnpm --filter shared run build
pnpm --filter web run build

# Post-deploy cache (V3.2)
curl -I https://yoteinvito.club/home
curl -I https://yoteinvito.club/explore
```

**Test umbral subcategorías:** `apps/web/lib/categories/subcategoryRailThreshold.test.ts` — archivo preparado; **no ejecutado** (web sin runner Vitest configurado).

---

## 10. Próximo paso recomendado

1. Ejecutar **QA manual Etapa 1** según `V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md`.
2. Luego iniciar **V3.3 Etapa 2 — Perfil usuario / Avatar** (upload foto, GCS).
