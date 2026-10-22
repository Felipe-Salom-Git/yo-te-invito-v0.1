# V3.3 — Expansión Gastronomía — CIERRE

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation`  
**Auditoría origen:** `V3_3_GASTRO_EXPANSION_DISCOVERY_AUDIT.md`

```text
HEAD inicial (pre-G1 isolation): bf97378
HEAD final:                       tip de feat/v1-s03-api-foundation (git rev-parse HEAD)
Push: NO
Merge: NO
Deploy: NO
```

---

## Estado G1–G7

| Etapa | Estado | Notas |
|---|---|---|
| G1 Multi-local isolation | COMPLETADA | Admin/owner/scanner scope por GastroProfile |
| G2 Taxonomía | COMPLETADA | EventSubcategory / EventTag canónicos |
| G3 GastroContent + galleries | COMPLETADA | galleryUrls + imageUrl fallback |
| G4 Métricas operativas | COMPLETADA | GastroProfileView; separado de economía |
| G5 Commercial agreement UX | COMPLETADA | Agreement por perfil; approve bloqueado sin CURRENT |
| G6 Economic reporting | COMPLETADA | Semántica EXACT / SETTLEMENT / PARTNER / NOT_ATTRIBUTABLE |
| G7 QA + hardening + docs | COMPLETADA (cierre código/docs) | Manual QA browser **PENDIENTE**; DB local **PASS** (release readiness 2026-10-22) |

---

## Accounting semantics (G6 — no alterar)

```text
DISCOUNT / EXACT
→ validated / allocated usages, CASH/BARTER base, credit generated, snapshots

SETTLEMENT_LEVEL
→ cash due / received / outstanding del settlement

PARTNER_LEVEL
→ courtesy balance, generated/consumed global

NOT_ATTRIBUTABLE
→ cashTransferredByDiscount, cashRemainingByDiscount, barterConsumedByDiscount
```

Sin prorrateo artificial de transfers ni DEBIT_COURTESY.

---

## View metrics semantics (G4)

```text
Page view = POST /public/gastro-locations/:id/view (recorded: true)
Scoped by gastroProfileId — nunca por owner-user agregado
Unique visitors: NO IMPLEMENTADO
```

---

## Migrations

| Migration | Propósito | Aplicada localmente | Pendiente producción |
|---|---|---|---|
| `20261022120000_gastro_content_gallery_urls` | GastroContent.galleryUrls | **Sí** (local 2026-10-22) | **No** — aplicada en prod |
| `20261022140000_gastro_profile_views` | GastroProfileView + viewCount | **Sí** (local 2026-10-22) | **No** — aplicada en prod |
| `20260901140000_benefit_settlement_domain` | Incluye partial unique settlement | Etapa 9 (ops) | Si entorno fresco |
| Otras Etapa 9 `20260901*` | Settlements/ledger | Etapa 9 | Según entorno |

**G7.1:** unicidad settlement GASTRO/ACTIVITY ya existe como partial unique SQL — **sin migration nueva**.

---

## Builds (G7.8)

| Target | Resultado |
|---|---|
| shared build | PASS |
| api build | PASS |
| web `next build` | PASS |
| scanner `next build` | PASS |
| web `tsc --noEmit` standalone | FAIL — vitest PREEXISTING (bbc8956, 2026-08-30) |

Detalle: `V3_3_G7_BUILD_STATUS.md`

---

## Tests automatizados (sin DB)

PASS (muestra representativa):

- `test:gastro-cross-profile-isolation`
- `test:gastro-profile-view-scope`
- `test:gastro-content-profile-scope`
- `test:gastro-taxonomy-compat`
- `test:g5-agreement-allocation-snapshots`
- `test:g6-discount-economic-traceability|summary|accounting`

DB integration: **PASS** local — `V3_3_G7_DB_INTEGRATION_STATUS.md` (migrate deploy + smoke; browser QA aún pendiente)

---

## QA manual

Checklist: `V3_3_G7_MANUAL_QA_CHECKLIST.md`

```text
Completada: NO (requiere browser + Postgres)
Pendiente:  SÍ — portal / admin / scanner / público / accounting E2E
```

---

## Known limitations

1. Manual browser QA aún pendiente (checklist G7.3–G7.7). DB local desbloqueada en release readiness.
2. `subcategoryRailThreshold.test.ts` + vitest: PREEXISTING; rompe `tsc` web standalone; **no** rompe `next build`.
3. Transfers CASH y DEBIT_COURTESY no atribuibles a descuento (por diseño).
4. Unique visitors de ficha: no implementado (G4).
5. Settlement unique no aparece como `@@unique` Prisma — sí como partial index SQL.

---

## Deployment considerations

1. Aplicar migrations G3/G4 gallery + profile views **antes** de depender de series/galerías.
2. Verificar índices partial settlement Etapa 9 en prod.
3. No push/merge desde este cierre — revisión humana primero.

---

## Documentación relacionada

- `V3_3_GASTRO_EXPANSION_DISCOVERY_AUDIT.md`
- `V3_3_G4_ANALYTICS_DISCOVERY.md`
- `V3_3_G7_SETTLEMENT_UNIQUE_REVIEW.md`
- `V3_3_G7_DB_INTEGRATION_STATUS.md`
- `V3_3_G7_MANUAL_QA_CHECKLIST.md`
- `V3_3_G7_BUILD_STATUS.md`
- `docs/context/CONTEXT_PENDIENTES.md` / `BACKEND_CONTEXT.md`
