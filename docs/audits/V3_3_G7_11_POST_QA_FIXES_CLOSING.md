# V3.3 G7.11 — Post-QA fixes / UX Gastronomía (closing)

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation`  
**Origen:** QA manual post-deploy de G7.10 ([`V3_3_G7_10_QA_FIXES_CLOSING.md`](./V3_3_G7_10_QA_FIXES_CLOSING.md))  
**Push / merge / deploy:** **NO**  
**G8 / G9:** **NOT STARTED**

## Rango de commits

| | SHA |
|---|---|
| HEAD inicial (G7.10 desplegado) | `6edb60c` |

| Slice | Commit | Mensaje |
|---|---|---|
| G7.11.1 | `b82c4af` | fix(v3.3): refresh gastro reviews when switching profiles |
| G7.11.2 | `a7715fc` | feat(v3.3): show gastro location preview in modal |
| G7.11.3 | `865c82f` | style(v3.3): compact gastro map into detail sidebar |
| G7.11.4 | `ecb7974` | feat(v3.3): add contextual settlement flow from gastro discounts |
| G7.11.5 | *(este doc)* | docs(v3.3): close gastro post-QA fixes |

## G7.11.1 — Selector de local en Valoraciones

**Causa raíz (solo client state, backend OK):** `ManagedReviewsCommentsPage` sincroniza filtros con la URL reconstruyendo el query string **solo** con sus claves (`quick`, `event`, `rating`, …). Al cambiar de local, el selector hace `router.replace(?profileId=B)` y el sync posterior reemplazaba la URL **sin** `profileId` → `GastroActiveLocationContext` volvía al primer local `ACTIVE` (A).

**Fix:**

- `mergeManagedReviewsSearchParams` (`lib/producer/managed-reviews-url.ts`) reescribe solo las claves de filtros y conserva el resto (p. ej. `profileId`).
- `resolveActiveGastroProfileId` (`lib/gastro/resolve-active-profile-id.ts`) extraído del contexto (misma lógica) para testear.
- Cambio de local → `page = 1`.
- Query keys ya incluían el `publicEventId` del local (`gastroReviewsKeys.summary` + `filtersKey`) — sin cambios.

**Test:** `lib/producer/managed-reviews-url.assert.ts` (A → B → nunca vuelve a A).

## G7.11.2 — «Ver ficha» en modal

- `/gastro/local`: solo lista **Mis locales**; se eliminó la preview inline debajo de la lista.
- «Ver ficha» → `GastroLocalPreviewModal` (reusa `GastroLocalPreview`, la ficha del portal; **no** segunda implementación). Query `gastroKeys.local(profileId)` del local clickeado; no cambia el local activo (`?profileId=`).
- Local sin ficha pública → aviso + «Completar local» dentro del modal.
- `Modal` (`components/ui/Modal.tsx`): prop opcional `size` (`md` default | `3xl`).
- `GastroLocalPreview` «Editar local» ahora incluye `?profileId=` del local mostrado.
- Estado del modal: `lib/gastro/local-preview-state.ts` (reducer).

**Test:** `lib/gastro/local-preview-state.assert.ts` (open A → close → open B = B).

## G7.11.3 — Mini mapa compacto en sidebar

- `EventLocationSection` (mismo componente, **sin** cambios de lat/lng/geocoding/Maps): prop opcional `compact` → mapa `h-48` (192 px) al 100 % del sidebar, CTA full width. Eventos sin cambios (default).
- `GastroPublicDetailContent`: mapa movido al `aside` debajo de horarios/ubicación; desktop = sidebar derecho, mobile = flujo normal.
- `aside` deja de ser `sticky` cuando hay mapa (evita que el sidebar alto quede cortado en pantallas bajas).

**Test:** visual (QA manual). `tsc` + `next build` PASS.

## G7.11.4 — Liquidación contextual desde descuento

**Auditoría:** `generate(vertical, partner, period)` es idempotente (existente → refresh; `CLOSED` → error); unicidad partner+period sigue en backend (partial unique Etapa 9). Asignación **mixta ya soportada** en el detalle (`allocate { mode, count }` CASH y BARTER por cantidad). **Sin cambios de backend ni contables.**

**Implementación (UI):**

- Admin descuento → botón **Liquidar** → `/admin/liquidaciones?generate=1&vertical=GASTRO&partnerId=<profileId>&fromDiscountId=<discountId>` (`profileId` = `item.profileId` del descuento).
- `SettlementGeneratePanel` (extraído de `admin/liquidaciones/page.tsx`): vertical + partner **readonly** en modo contextual; solo el local del descuento; muestra acuerdo vigente (`AdminGastroDiscountCommercialContextPanel` con `allowManage=false`); link «Volver al descuento».
- Body de `generate` = `{ vertical, periodKey, gastroProfileId }` — **sin** `discountId` (no existe Settlement → Discount).
- Pantalla general **Nueva liquidación** intacta (selección manual).
- Sin `cashTransferredByDiscount` / `barterConsumedByDiscount`; snapshots de allocation sin cambios.

**Tests:** `lib/admin/settlement-generate-context.assert.ts` (discount A → GASTRO + partner A, sin B, body partner+period); regresión `settlement-partner-options.assert.ts`, `test:benefit-settlement-domain` (unit PASS; DB integration NO EJECUTADO — PostgreSQL local no disponible), `test:benefit-settlement-admin-ui` PASS.

## Builds / tests

| Target | Resultado |
|---|---|
| `pnpm --filter @yo-te-invito/shared build` | **PASS** |
| `pnpm --filter api run build` | **PASS** |
| `pnpm --filter web run build` | **PASS** (ECONNREFUSED SSG sin API local — conocido) |
| `pnpm --filter scanner run build` | **PASS** |
| Web `tsc --noEmit` standalone | **PREEXISTING FAIL** — solo `vitest` en `subcategoryRailThreshold.test.ts` |
| Asserts web (`tsx`) | **PASS** — managed-reviews-url, local-preview-state, settlement-generate-context, settlement-partner-options |
| `test:gastro-cross-profile-isolation`, `test:gastro-multi-local` | **PASS** |

Asserts web: `apps/api/node_modules/.bin/tsx apps/web/lib/<path>.assert.ts`.

## Migrations

Ninguna.

## QA pendiente

- [ ] QA 4 — rails secundarios (requiere datos: local con primary A + secondary B en subcategoría con rail)
- [ ] Browser post-deploy G7.11: cambio de local en Valoraciones; modal «Ver ficha» A → B; mini mapa sidebar desktop/mobile; «Liquidar» desde descuento → panel preseleccionado → detalle con asignación CASH/BARTER
