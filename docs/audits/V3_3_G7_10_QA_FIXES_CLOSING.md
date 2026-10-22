# V3.3 G7.10 — QA fixes + onboarding refinement (closing)

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation`  
**Push / merge / deploy:** **NO**  
**G8 / G9:** **NOT STARTED** (roadmap only — ver `docs/context/V3_3_G8_G9_ROADMAP.md`)

## Rango de commits

| | SHA |
|---|---|
| HEAD previo a G7.10 (post G7 + AuthModule hotfix) | `abe65bc` (referencia operativa; tip previo a fixes: ver log) |
| HEAD final G7.10 | `7d83c75` |

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
| G7.10.10 | *(este doc)* | docs(v3.3): close gastro QA fixes |

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

## Manual QA pendiente (post-deploy)

Checklist reducido — **no marcar browser global PASS automáticamente**:

- [ ] Admin dashboard: perfiles gastro **PENDING**
- [ ] Liquidaciones: selector de partner gastro (`status: active`)
- [ ] Cards discovery: chips multi-subcategoría
- [ ] Rails secundarios por subcategoría
- [ ] Valoraciones acotadas al `publicEventId` del perfil
- [ ] Scanner accounts: label del local (`parentDisplayName`)
- [ ] Ficha pública gastro: mini mapa
- [ ] Signup GASTRO: cuenta sin local → portal vacío → CTA **Crear mi primer local** → `PENDING`
- [ ] Crear local: default **Río Negro / San Carlos de Bariloche** (editable)
- [ ] Editar local existente: no sobrescribe ubicación

## Impacto en G8

- Onboarding account-only facilita multi-local previo a Courtesy Coupon.
- Isolation por `GastroProfile` (reviews, scanner label, rails) alinea con G8 profile-scoped cortesías.
- **No** se implementó dominio Courtesy Coupon en este slice.

## Working tree al cierre

Limpio tras commit docs (salvo cambios locales del operador).

## Push / Deploy / G8

```text
Push:   NO
Deploy: NO
G8:     NOT STARTED
G9:     NOT STARTED
```
