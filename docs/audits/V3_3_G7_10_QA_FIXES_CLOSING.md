# V3.3 G7.10 — QA fixes + onboarding refinement (closing)

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation`  
**Push / deploy:** **SÍ** (R0, 2026-10-22 — ver § Release R0) · **Merge:** **NO**  
**G8 / G9:** **NOT STARTED** (roadmap only — ver `docs/context/V3_3_G8_G9_ROADMAP.md`)  
**Follow-up:** fixes post-QA en [`V3_3_G7_11_POST_QA_FIXES_CLOSING.md`](./V3_3_G7_11_POST_QA_FIXES_CLOSING.md)

## Rango de commits

| | SHA |
|---|---|
| HEAD previo a G7.10 (post G7 + AuthModule hotfix) | `abe65bc` (referencia operativa; tip previo a fixes: ver log) |
| Último commit de código G7.10 | `7d83c75` (G7.10.9) |
| HEAD final G7.10 (cierre docs, desplegado) | `6edb60c` |

Commits G7.10.1–.9 (orden tip → base del slice):

| Slice | Commit | Mensaje |
|---|---|---|
| G7.10.1 | `51708fd` | fix(v3.3): surface pending gastro profiles in admin dashboard |
| G7.10.2 | `fd4eaa0` | fix(v3.3): populate settlement partner selector |
| G7.10.3 | `108c8e6` | feat(v3.3): show gastro subcategories on discovery cards |
| G7.10.4 | `90a5d44` | fix(v3.3): include gastro secondary subcategories in rails |
| G7.10.5 | `b30bcee` | fix(v3.3): scope gastro reviews by profile |
| G7.10.6 | `f601574` | feat(v3.3): show gastro profile on scanner accounts |
| G7.10.7 | `b4dd036` | feat(v3.3): add mini map to gastro public detail |
| G7.10.8 | `a49a6ff` | feat(v3.3): decouple gastro account and location onboarding |
| G7.10.9 | `7d83c75` | feat(v3.3): default gastro location to Bariloche |
| G7.10.10 | `6edb60c` | docs(v3.3): close gastro QA fixes |

## Migrations nuevas

Ninguna. G7.10 no introduce migraciones Prisma.

## Builds / asserts (G7.10.10)

| Target | Resultado |
|---|---|
| `pnpm --filter @yo-te-invito/shared build` | **PASS** |
| `node packages/shared/dist/schemas/profile-onboarding.gastro-signup.assert.js` | **PASS** |
| `node packages/shared/dist/location/gastro-create-defaults.assert.js` | **PASS** |
| `pnpm --filter api run build` | **PASS** |
| `pnpm --filter web run build` | **PASS** (`next build`; ECONNREFUSED fetch en SSG sin API local — no bloquea) |
| `pnpm --filter scanner run build` | **PASS** |
| Web `tsc --noEmit` standalone | **PREEXISTING FAIL** (`vitest` en `subcategoryRailThreshold.test.ts`) — no bloquea `next build` |

## Manual QA (post-deploy, operador 2026-10-22)

| # | Caso | Resultado |
|---|---|---|
| 1 | Admin dashboard: perfiles gastro **PENDING** | **PASS** |
| 2 | Liquidaciones: selector de partner gastro (`status: active`) | **PASS** + mejora UX → liquidación contextual (G7.11.4) |
| 3 | Cards discovery: chips multi-subcategoría | **PASS** |
| 4 | Rails secundarios por subcategoría | **PENDING** — faltan datos suficientes (no es bug) |
| 5 | Valoraciones acotadas al `publicEventId` del perfil | **PARTIAL** — dominio OK; bug UX selector de local → fix G7.11.1 |
| 6 | Scanner accounts: label del local (`parentDisplayName`) | **PASS** |
| 7 | Ficha pública gastro: mini mapa | **PASS** + polish layout → G7.11.3 |
| 8 | Signup GASTRO: cuenta sin local → portal vacío → CTA **Crear mi primer local** | **PASS** |
| 9 | Crear local: default **Río Negro / Bariloche** (editable) → `PENDING` → approve → `ACTIVE` | **PASS** |
| 10 | Editar local existente: no sobrescribe ubicación | **PASS** |

## Release R0 (2026-10-22)

```text
Push:        PASS — abe65bc..6edb60c (fast-forward, sin force); local = remote = 6edb60c
Deploy:      ejecutado por el operador en VPS siguiendo DONWEB_PRODUCTION_RUNBOOK
             (la clave SSH requiere passphrase → el agente no tuvo acceso)
Migrations:  prisma migrate deploy → "111 migrations found" / "No pending migrations to apply."
Stash VPS:   prod-pre-v33-gastro-deploy-authmodule-hotfix conservado como backup (sin stash pop)
```

Las migrations G3/G4 (`20261022120000_gastro_content_gallery_urls`, `20261022140000_gastro_profile_views`) ya estaban aplicadas en producción desde el deploy anterior.

## Impacto en G8

- Onboarding account-only facilita multi-local previo a Courtesy Coupon.
- Isolation por `GastroProfile` (reviews, scanner label, rails) alinea con G8 profile-scoped cortesías.
- **No** se implementó dominio Courtesy Coupon en este slice.

## Working tree al cierre

Limpio tras commit docs (salvo cambios locales del operador).

## Push / Deploy / G8

```text
Push:   SÍ (6edb60c)
Deploy: SÍ (6edb60c)
G8:     NOT STARTED
G9:     NOT STARTED
```
