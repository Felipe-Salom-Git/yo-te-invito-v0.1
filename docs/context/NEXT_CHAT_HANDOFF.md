# Yo Te Invito — Next Chat Handoff

**Actualizado:** 2026-08-30 · Rama: `feat/v1-s03-api-foundation` · HEAD: `920c5d7`

Punto de entrada operativo. Detalle completo: `AI_ENTRYPOINT.md`, `PROJECT_CONTEXT.md`, `CONTEXT_PENDIENTES.md`.

---

## 1. Stack

| Capa | Tecnología |
|------|------------|
| Monorepo | pnpm + Nx |
| Web | Next.js 15 App Router, React, Tailwind, TanStack Query, NextAuth |
| API | NestJS, Prisma, PostgreSQL, Zod, BullMQ + Redis (emails) |
| Shared | `packages/shared` — schemas, enums, helpers |
| Scanner | PWA `apps/scanner` |
| Auth | JWT + NextAuth; dev: `X-Dev-User-Id` |

---

## 2. Arquitectura

```txt
User → Next.js → ApiRepository → NestJS Controller → Service → Prisma → PostgreSQL
```

- **No** fetch directo desde componentes — usar repositories.
- Controllers: HTTP + Zod. Services: lógica. Prisma: persistencia.
- Tenant default público: `tenant-demo`.
- Roles reales (`packages/shared/src/enums/role.ts`): `ADMIN`, `PRODUCER_OWNER`, `PRODUCER_STAFF`, `GASTRO_OWNER`, `HOTEL_OWNER`, `REFERRER`, `SCANNER`, `USER`.

---

## 3. Producción

| Componente | Detalle |
|------------|---------|
| VPS | Ubuntu DonWeb — SSH `deploy@…:5230` (`ssh yoteinvito`) |
| Reverse proxy | Nginx |
| Procesos | systemd: `yti-web` (:3000), `yti-api` (:3001), `yti-scanner` (:3002) |
| BD | PostgreSQL local en VPS |
| Cola | Redis (BullMQ emails) |
| Storage | GCS `yti-prod-storage` (privado) + `yti-prod-public-assets` |
| Maps | Google Maps/Geocoding + Georef Argentina |
| Emails | SMTP DonWeb `@yoteinvito.club` |
| Dominios | `yoteinvito.club`, `api.yoteinvito.club`, `scanner.yoteinvito.club` |

**Migraciones prod:** solo `npx prisma migrate deploy` — **nunca** `migrate dev` ni `migrate reset`.

**Deploy web con caché limpia** (post hotfix HTML): ver `V3_2_HOTFIX_PUBLIC_CACHE_CLOSING.md` §6.

Runbook: `docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`.

---

## 4. Estado V3.2 — Mejoras visuales / Discovery

**Código implementado** (slices 0–11). Checklist: `docs/dev/Yo_Te_Invito_Checklist_V3_2_Mejoras_Visuales.md`.

| Slice | Estado código |
|-------|---------------|
| Banners categoría / transición / footer verde | ✅ |
| Cards simplificadas + Gastro/descuentos | ✅ |
| Buscador predictivo (`/public/events/suggestions`) | ✅ |
| Selector ciudad buscable (`SearchableCombobox`) | ✅ |
| Reviews caritas 1–5 | ✅ |
| Mapas lazy en modal ubicación | ✅ |
| Admin dashboard pendientes consolidados | ✅ |
| Descuentos en hero Gastro | ✅ |
| Event/Gastro Próximamente + preview por rol | ✅ |
| Docs/context slice 11 | ✅ |

**Pendiente:** QA manual browser (`docs/audits/V3_2_QA_CLOSING.md`, checklist § smokes).

---

## 5. Últimos hotfixes (2026-08, en rama)

| Hotfix | Commit | Doc |
|--------|--------|-----|
| Caché HTML pública Next.js | `15f2776` | `docs/audits/V3_2_HOTFIX_PUBLIC_CACHE_CLOSING.md` |
| Category availability por rol | `b8dc571` | `docs/audits/V3_2_SLICE_10_COMING_SOON_CLOSING.md` |
| Reenvío email verificación | `ff6f8e0` | `docs/audits/AUTH_EMAIL_VERIFICATION_RESEND_CLOSING.md` |
| Horarios gastro overnight | `920c5d7` | `docs/audits/V3_2_HOTFIX_GASTRO_OVERNIGHT_HOURS_CLOSING.md` |

### Reglas de acceso discovery (vigentes)

- **Eventos:** público → Próximamente; preview: `ADMIN`, `PRODUCER_OWNER`, `PRODUCER_STAFF`.
- **Gastronomía:** público → Próximamente; preview: `ADMIN`, `GASTRO_OWNER`.
- **Rentals / Excursiones:** públicas.
- Portales `/producer/*`, `/gastro/*`, `/admin/*` no se bloquean.
- Fuente: `packages/shared/src/category-availability.ts`.

### Auth resend (flujo)

```txt
registro → email verificación → token vence → login EMAIL_NOT_VERIFIED
→ botón reenvío → POST /auth/resend-verification-email → nuevo token → verify → login
```

### Caché HTML (política actual)

Rutas discovery (`/`, `/home`, `/explore`, `/categoria/*`): `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`.  
Assets `/_next/static/*`: caché larga con hash (no tocar).

---

## 6. Reglas importantes

- Pago **demo** en checkout — no eliminar (`POST /public/payments/:id/demo-confirm`).
- Scanner PWA — no romper.
- Dark premium: black / white / green.
- Slices pequeños; auditoría antes de refactors grandes.
- No commitear secretos (`.env`).
- Usuario maestro: `felipe.e.salom@gmail.com` — preservado por `db:cleanup-content`.
- Rama activa: `feat/v1-s03-api-foundation` — no tocar `main` salvo instrucción.

---

## 7. Pendientes actuales (priorizados)

1. **QA prod** hotfixes V3.2 (cache headers, roles Event/Gastro, auth resend, horarios overnight).
2. **V3.2 QA browser** — smokes manuales checklist.
3. **Deploy VPS** si commits `15f2776`…`920c5d7` no están en prod.
4. Publicar términos comerciales en `/admin/legales` (`producer_terms`, etc.) — bloquean registro comercial.
5. Getnet abandonado como pasarela activa; nueva pasarela TBD.
6. Ticketera UI Próximamente hasta nueva pasarela.

Detalle: `CONTEXT_PENDIENTES.md`.

---

## 8. Riesgos conocidos

- HTML discovery cacheado si deploy web sin build limpio (ver hotfix cache).
- Usuarios no verificados bloqueados hasta reenvío/verify (comportamiento esperado).
- Event/Gastro ocultos para público hasta flip en `category-availability.ts`.
- Getnet webhook fix en código (`ed0cc3e`) pero pasarela no activa productivamente.

---

## 9. Comandos habituales de validación

```bash
pnpm db:up && pnpm db:migrate          # solo local
pnpm run -w dev                        # API :3001 + web :3000

pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build

pnpm --filter api run test:category-availability
pnpm --filter api run test:auth-resend-verification
pnpm --filter api run test:opening-hours

# Prod cache check (post-deploy)
curl -I https://yoteinvito.club/home
curl -I https://yoteinvito.club/explore
curl -I https://yoteinvito.club/categoria/rental

# Ops usuario
pnpm --filter api run user:inspect -- <email>
pnpm --filter api run user:verify-email -- <email>
```

---

## 10. Próximo paso recomendado

**Deploy + QA en producción** de los cuatro hotfixes (cache, roles, auth resend, horarios gastro): build web limpio, restart systemd, validar con `curl -I` y smoke manual por rol (`USER` vs `GASTRO_OWNER` vs `PRODUCER_OWNER`).
