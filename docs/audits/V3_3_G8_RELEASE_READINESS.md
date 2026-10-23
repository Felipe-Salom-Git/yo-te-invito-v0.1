# V3.3 — G8 — Release readiness

**Fecha:** 2026-10-23  
**Branch:** `feat/v1-s03-api-foundation`  
**Alcance del paquete local aún no publicado:** G7.11 + G7.12 + G8.0–G8.13  
**Push:** NO · **Deploy:** NO · **Producción:** sin cambios

Detalle de la regresión: [`V3_3_G8_COURTESIES_CLOSING.md`](./V3_3_G8_COURTESIES_CLOSING.md).  
QA humana: [`V3_3_G8_MANUAL_QA_CHECKLIST.md`](./V3_3_G8_MANUAL_QA_CHECKLIST.md).

---

## Clasificación

| Dimensión | Estado | Por qué |
|---|---|---|
| **CODE READY** | **YES** | G8.12 exit 0 en las suites de cortesía, multi-local, acuerdo, scanner, Studio, portal, admin, accounting, G6 y G7.12. Builds shared / api / web / scanner PASS. Cero fixes de regresión: no hubo bug que corregir |
| **DB READY** | **YES** (schema) | Local: 111 migrations, schema up to date. G7.11–G8.13 agregan **cero** migrations. Producción, en el deploy G7.10, ya tenía esas 111 y ninguna pendiente. `migrate deploy` de esta ventana no debería aplicar nada nuevo |
| **DEPLOY READY** | **NO** | El paquete se puede entregar al operador, pero **no se desplegó** y el QA manual sigue pendiente. No se declara producción cerrada |
| **MANUAL QA PENDING** | **YES** | Ningún flujo de browser de G7.11, G7.12 ni G8 se recorrió en esta sesión |

La integración de comportamiento contra PostgreSQL es **PARTIAL** (no contradice DB READY de schema):

- **En DB real:** funding, elegibilidad, guard de allocation, CASH/BARTER/mixto, cierre, reporting de cortesía financiada vs no financiada, snapshot de acuerdo, cruce de local en settlement (`test:gastro-courtesy-accounting`, escenarios A–H).
- **Solo unit / Prisma falso:** lifecycle, emails, scanner, shortCode, Studio, portal, admin, predicados de aislamiento.
- **Conecta y se detiene:** `test:benefit-settlement-operations` (no hay escenario seed). `test:benefit-commercial-agreements` no escribió filas: faltan partners seed.
- **Sin script:** concurrencia de funding, de crédito y de overpayment. Scanner HTTP.

---

## Builds

| Comando | Exit | Resultado |
|---|---|---|
| `pnpm --filter @yo-te-invito/shared build` | 0 | PASS |
| `pnpm --filter api run build` | 0 | PASS |
| `pnpm --filter web run build` | 0 | PASS |
| `pnpm --filter scanner run build` | 0 | PASS |
| `apps/web` → `npx tsc --noEmit` | 2 | **PREEXISTING.** Único error: `lib/categories/subcategoryRailThreshold.test.ts` (`vitest`). No bloquea `next build` |

---

## Migrations

```text
G7.11 – G8.13 → ZERO migrations
```

Comprobado con `git diff origin/feat/v1-s03-api-foundation...HEAD -- apps/api/prisma/migrations` (vacío antes del commit de docs; este commit tampoco toca `prisma/`).

No se modificó el schema para cerrar G8.

---

## Known deferred

Ver la lista numerada del cierre G8 §7. Los que importan para el deploy:

- No hay restauración automática del crédito si se cancela una cortesía financiada.
- No se auditaron allocations legacy en la base de producción.
- El QA de browser no está hecho.
- Los rails de subcategoría secundaria siguen sin datos suficientes.

Ninguno de esos ítems falló la regresión de código.

---

## Qué puede hacer el operador

Cuando decida publicar, el orden y los comandos están en el cierre G8 §8 y salen de `docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`. Esta sesión no hizo push ni deploy.

Después del smoke del runbook, recorrer el checklist manual. Recién ahí tiene sentido marcar QA de G7.11, G7.12 y G8.
