# V3.3 G10 — Release readiness

**Fecha:** 2026-11-02 · **Rama:** `feat/v1-s03-api-foundation`  
**Producción hoy:** G7.11 → G9 (`origin/feat/v1-s03-api-foundation` = `765f8f2`, 111 migrations).  
**Paquete:** `50d0c29` (discovery G10.0) → cierre G10.E. Commits G10.A `83d61ab`…`bc2429d`, G10.B `af110bb`…`e12a2d6`, G10.C `41539e4`…`2e6a2d2`, G10.D `1553f26`…`ea1d57b`, G10.E `307b1af`, `af6c010`, `ab92be7` + docs.  
**Push:** NO · **Deploy:** NO · **Migration / backfill en producción:** NO.  
Runbook: [`docs/runbooks/V3_3_G10_PRODUCTION_DEPLOY.md`](../runbooks/V3_3_G10_PRODUCTION_DEPLOY.md) · QA: [`V3_3_G10_MANUAL_QA_CHECKLIST.md`](./V3_3_G10_MANUAL_QA_CHECKLIST.md).

---

## 1. Unidad de release

```text
G10.A + G10.B + G10.C + G10.D  =  UNA sola unidad de release.  No desplegar parcialmente.
```

| Si se despliega solo… | Qué se rompe |
|---|---|
| A | La UI de contratos del local da 400 (D-G10-10) y los gates de approval siguen sobre el contrato legacy ⇒ descuentos aprobados sin contrato propio |
| A + B | Sin lectura económica por descuento ni forma de cobrar por descuento; los pagos GASTRO nacen sin atribución |
| A + B + C | Toda transfer GASTRO nueva queda `SETTLEMENT_LEVEL` para siempre (G10.D exige `gastroDiscountId`); el resumen muestra `paid = 0` |
| A + B + C + D | Coherente: contratos, approval, lectura y cobro por descuento, integridad |

G10.E agrega la CLI de integridad que usa el paso 17 del runbook: viaja en el mismo push.

## 2. Clasificación

| Dimensión | Estado | Evidencia |
|---|---|---|
| **CODE READY** | **YES** | Builds `shared` / `api` / `web` / `scanner` PASS en `ab92be7` (último commit con código; lo posterior es documentación). El build web registra `fetch failed` al prerenderizar sin API levantada y termina en exit 0 (previo). Regresión E2: 102 suites, 97 PASS, 5 fallas de entorno o previas, fuera de G10, 0 regresiones. E1: reporting e integridad revisados y corregidos (CLI de integridad rota → ahora corre todos los chequeos G10) |
| **DB READY** | **YES** | 1 migration aditiva (columnas nullable, FKs `RESTRICT`, índices, CHECKs; sin UPDATE / DELETE). Local: 112 aplicadas. Drift de `prisma migrate diff`: solo histórico previo a G10, nada en objetos G10 |
| **MIGRATION READY** | **YES** | Ensayo E3: `pnpm --filter api exec prisma migrate deploy` sobre base pre-G10 aplica exactamente `20261102120000_benefit_agreement_discount_scope`, 0 filas modificadas, `migrate status` up to date |
| **BACKFILL READY** | **YES** | Ensayo E3: dry-run = plan esperado y 0 escrituras; confirm = solo INSERT (6 + 6 audits); segundo dry-run 0 copias; legacy idéntico; locales sin contrato sin copias. STOP condition contra A0 definida (runbook § 14) |
| **DEPLOY READY** | **YES** (para que el operador ejecute) | Runbook de 19 pasos con salidas esperadas y STOP por paso; backup GCS obligatorio; orden de build explícito (`shared` antes de la API). No desplegado |
| **MANUAL QA READY** | **YES** | Checklist por rol y flujo listo. **Ejecución: PENDIENTE post-deploy** (no hubo QA visual en G10.A–E) |
| **ROLLBACK READY** | **YES, con ventana** | Antes del backfill: rollback de código posible (migration aditiva queda). Después del backfill y de las primeras operaciones G10: **forward-fix only**. Sin rollback destructivo prometido (runbook § Rollback) |

## 3. Orden de producción (resumen)

```text
1 preflight VPS → 2 backup PostgreSQL (GCS, verificar .sql.gz) → 3 pull --ff-only → 4 pnpm install --frozen-lockfile
→ 5 shared build → 6 prisma generate → 7 API build → 8 web build → 9 scanner build
→ 10 prisma migrate deploy → 11 restart yti-api / yti-web / yti-scanner → 12 health
→ 13 backfill DRY-RUN → 14 comparar contra A0 (STOP si difiere) → 15 backfill --confirm → 16 segundo dry-run (0)
→ 17 integridad (CLI + SQL read-only) → 18 smoke HTTP → 19 QA manual
```

**`shared` se compila ANTES que la API:** los paquetes consumen `packages/shared/dist`; un `dist` viejo ya hizo fallar la API en producción.

## 4. Estado conocido A0 (base de comparación)

15 locales con agreements (2 con historial ⇒ 17 filas legacy) · 6 locales con descuentos sin agreement · 5 descuentos ACTIVE/APPROVED sin coverage · 0 descuentos sin `gastroProfileId` · 11 validaciones pendientes en 10 descuentos · 0 settlements GASTRO con allocations · 0 cortesías financiadas. Detalle e IDs en el runbook § A0.

## 5. Riesgos conocidos (aceptados)

1. **Ventana restart → backfill (pasos 11–15):** los descuentos facturables se ven sin contrato y no se pueden aprobar ni liquidar; nada se desactiva. Se mitiga con el congelamiento económico corto del runbook.
2. **5 descuentos ACTIVE/APPROVED sin cobertura** (locales sin contrato legacy): siguen ACTIVE y escaneables, sus usos quedan `MISSING_AGREEMENT` hasta que ADMIN cargue el contrato del descuento. Tarea operativa post-deploy; no se inventan precios.
3. **Rollback limitado** después del backfill (forward-fix only).
4. **QA visual** nunca ejecutado en G10: la UI está cubierta por builds y asserts puros, no por navegador.
5. **Cortesía ADMIN no financiada:** solo por API (`POST /gastro/discounts/courtesy/send` con `agreement`); sin pantalla propia.
6. **Comprobantes:** `proofUrl` = URL `http(s)` pública; sin upload privado.
7. **`LIMIT_REACHED`:** el backend no lo emite desde `ffa333f` (sin límite diario); solo sobrevive como etiqueta.
8. **Previos fuera de G10:** `test:auth-resend-verification` (un assert), smokes HTTP `door-scan` / legales sin fixtures de entorno, drift histórico de índices / enums en `prisma migrate diff`, web `tsc` suelto con errores de `vitest`.

## 6. Antes del push

- Working tree: solo `.cursorignore` (no rastreado) y `packages/shared/src/benefit-settlement-operations.assert.ts` con diff **solo de fin de línea**: ninguno se commitea.
- `git push origin feat/v1-s03-api-foundation` sin `--force`; luego `git rev-parse HEAD` = `git rev-parse origin/feat/v1-s03-api-foundation`.

```text
Ready to push:    YES (cuando el operador lo indique)
Ready to deploy:  YES (siguiendo el runbook; STOP condition A0 en el paso 14)
Manual QA:        PENDING POST-DEPLOY
```
