# V3.3 G7.8 — Build status

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation`

## Resultados

| Target | Comando | Resultado |
|---|---|---|
| Shared | `pnpm --filter @yo-te-invito/shared build` | **PASS** |
| Prisma generate | `pnpm db:generate` | **PASS** |
| API | `pnpm --filter api run build` (`prisma generate && nest build`) | **PASS** |
| Web (canónico) | `pnpm --filter web run build` (`next build`) | **PASS** |
| Scanner | `pnpm --filter scanner run build` (`next build`) | **PASS** |
| Web standalone tsc | `apps/web` → `tsc -p tsconfig.json --noEmit` | **FAIL** (ver abajo) |
| Monorepo `pnpm build` | = generate + shared + api/web/scanner next builds | **Equivalente PASS** (componentes ejecutados) |

## Issue vitest / subcategoryRailThreshold.test.ts

```text
Archivo: apps/web/lib/categories/subcategoryRailThreshold.test.ts
Error: TS2307 Cannot find module 'vitest'
Introducido: bbc8956 (2026-08-30) — feat(v3.3): add thresholded subcategory rails
```

| Pregunta | Respuesta |
|---|---|
| ¿Qué comando falla? | `tsc -p apps/web/tsconfig.json --noEmit` (incluye `**/*.ts` → el `.test.ts`) |
| ¿Qué comando pasa? | `pnpm --filter web run build` (`next build`) — typecheck de producción Next **no** falla por este archivo en la práctica actual |
| ¿`pnpm build` global falla? | **No** en los targets canónicos ejecutados (shared/api/web/scanner builds PASS) |
| ¿Preexistente a G1–G7? | **Sí** (Ago 2026 ≪ Oct 2026 expansión G1–G6) |
| ¿Afecta producción? | **No** — artefacto de test no empaquetado; next build PASS |
| ¿Fix en G7? | **No** — PREEXISTING / fuera de alcance salvo follow-up (`exclude` tests del tsconfig o añadir vitest) |

**Clasificación:** `PREEXISTING / NON-BLOCKING para next build`  
**No marcar** `tsc -p web` standalone como PASS.
