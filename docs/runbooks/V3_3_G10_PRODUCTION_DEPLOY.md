# Runbook — Deploy de producción V3.3 G10 (contrato, liquidación y pagos por descuento)

**Unidad de release:** **G10.A + G10.B + G10.C + G10.D** (+ G10.E: CLI de integridad y docs). **Una sola unidad. No desplegar parcialmente.**  
**Rama:** `feat/v1-s03-api-foundation` · **VPS:** DonWeb `ssh yoteinvito` (usuario `deploy`, puerto 5230) · **Repo:** `/opt/yoteinvito`  
**Servicios:** `yti-api` (:3001), `yti-web` (:3000), `yti-scanner` (:3002) · **DB:** PostgreSQL local `yo_te_invito`  
**Migration nueva:** 1 — `20261102120000_benefit_agreement_discount_scope` (aditiva: columnas nullable, FKs `RESTRICT`, índices, CHECKs; sin UPDATE / DELETE).  
**Backfill:** `benefit-agreements:backfill-discount-scope` (insert-only, idempotente).  
**Ensayo previo:** [`V3_3_G10_E3_DB_REHEARSAL.md`](../audits/V3_3_G10_E3_DB_REHEARSAL.md) (mismo orden, PASS). Readiness: [`V3_3_G10_RELEASE_READINESS.md`](../audits/V3_3_G10_RELEASE_READINESS.md).

> **Prohibido en producción:** `prisma migrate dev`, `prisma migrate reset`, `prisma db push`, `pnpm db:migrate`, `pnpm db:reset-dangerous`, `db:cleanup-content`. Solo `pnpm --filter api exec prisma migrate deploy`.

> Si la clave SSH tiene passphrase y el agente no la tiene cargada, el operador corre cada bloque y pega la salida. **Cualquier salida distinta de la esperada = STOP**, no se sigue con el paso siguiente.

---

## 0. Antes de empezar

- Ventana acordada. Desde el paso 10 hasta el paso 16 **nadie opera** contratos, liquidaciones, asignaciones ni pagos desde el admin (congelamiento económico corto).
- Tener a mano el **A0 conocido** (§ A0 abajo) y este runbook.
- Push ya hecho desde local (`git push origin feat/v1-s03-api-foundation`, sin `--force`), con HEAD local = remoto.

## A0 — estado conocido de producción (preflight G10.A, solo lectura)

```text
15 locales con agreements GASTRO (13 con 1 fila, 2 con historial de 2 filas:
   cmv1cjh680004i687ggnpcya8, cmvjl8wgp0017vndkjhd9aor8); todos con exactamente 1 fila abierta
   ⇒ 17 agreements legacy GASTRO en total
6 locales con descuentos pero sin agreement:
   cmqycba1p000id6l28kuv0qmk, cmtt08lod000i4cmiu10xzppo, cmr0z47490013qyjj0naxgo7z,
   cmr11t0ha001vympcs4fph9ra, cmsmtc0ll000ocg669fwjk6tc, cmqrfzz4e000p13q0iebech34
5 descuentos ACTIVE/APPROVED sin coverage (en esos 6 locales)
0 GastroDiscount sin gastroProfileId
11 validaciones pendientes (con claim, sin allocation) en 10 descuentos
0 settlements GASTRO con allocations (⇒ 0 transfers GASTRO legacy relevantes)
0 cortesías financiadas (DEBIT_COURTESY)
```

---

## 1. Preflight VPS

```bash
cd /opt/yoteinvito
git branch --show-current            # feat/v1-s03-api-foundation
git rev-parse HEAD                   # anotar como ROLLBACK_SHA (código G9 desplegado)
git status --short                   # vacío o solo no-rastreados conocidos
git stash list                       # stash conocido prod-pre-v33-…; NO hacer stash pop
systemctl is-active yti-api yti-web yti-scanner   # active ×3
df -h / && free -m                   # disco < 80 %, RAM libre para builds
node -v && pnpm -v                   # v20.x · 9.14.x
cd apps/api && npx prisma migrate status; cd /opt/yoteinvito   # 111 aplicadas, schema up to date
sudo -u postgres psql -d yo_te_invito -X -f /opt/yoteinvito/scripts/ops/g10-a0-preflight-readonly.sql \
  | tee /tmp/g10-a0-now.txt          # A0 de HOY (solo lectura; termina en ROLLBACK)
```

**STOP si:** otra rama, archivos modificados rastreados, algún servicio caído, `migrate status` con pendientes, o el A0 de hoy difiere del A0 conocido sin explicación (nuevos locales con agreements, filas abiertas solapadas, cortesías financiadas > 0, settlements GASTRO con allocations > 0). Si difiere por operaciones legítimas desde el A0, documentarlo y usar el A0 de hoy como base del paso 14.

## 2. Backup PostgreSQL → GCS

```bash
bash /opt/yoteinvito/scripts/ops/backup-postgres-to-gcs.sh \
  --env-file /opt/yoteinvito/.ops/backup-gcs.env
gsutil ls -l "gs://yti-prod-storage/backups/postgres/$(date +%Y)/$(date +%m)/" | tail -n 4
```

**Esperado:** el script termina con `Backup completado: gs://…/yo_te_invito_YYYYMMDD_HHMMSS.sql.gz`; el `ls` muestra ese `.sql.gz` (tamaño coherente con los anteriores) **y** su `.sha256` con la hora de ahora. Anotar el nombre del archivo.  
**STOP si** el script falla, no aparece el `.sql.gz` del momento, o el tamaño es anómalo (mucho menor que el anterior).

## 3. Pull fast-forward

```bash
cd /opt/yoteinvito
git fetch origin
git pull --ff-only origin feat/v1-s03-api-foundation
git log -1 --oneline                 # HEAD de release (cierre G10.E)
git log --oneline ROLLBACK_SHA..HEAD | wc -l
ls apps/api/prisma/migrations | grep 20261102120000_benefit_agreement_discount_scope
```

**STOP si** `--ff-only` falla (nunca merge / rebase / reset en el VPS).

## 4. Dependencias

```bash
pnpm install --frozen-lockfile
```

**STOP si** el lockfile no coincide.

## 5. Build de `shared` (SIEMPRE antes de la API)

```bash
pnpm --filter shared run build
ls -la packages/shared/dist/index.js   # fecha = ahora
```

> **Por qué primero:** `@yo-te-invito/shared` se consume desde `packages/shared/dist` (`main: ./dist/index.js`). Si la API (o web / scanner) compila contra un `shared/dist` viejo, falla o arranca con contratos desactualizados — **ya pasó en producción**. G10 agrega exports en shared (scope de agreements, resumen económico, pagos por descuento, atribución de transfers) que la API necesita.

## 6. Prisma generate

```bash
pnpm --filter api exec prisma generate
```

(El `build` de la API también corre `prisma generate`; se hace explícito para fallar temprano.)

## 7. Build API

```bash
pnpm --filter api run build
```

## 8. Build web

```bash
pnpm --filter web run build
```

## 9. Build scanner

```bash
pnpm --filter scanner run build
```

**STOP en 5–9** ante cualquier error de compilación: los servicios siguen con el código G9 ya cargado en memoria y la DB todavía no cambió (rollback = `git checkout ROLLBACK_SHA` + rebuild, ver § Rollback A).

## 10. Migration

```bash
cd /opt/yoteinvito
pnpm --filter api exec prisma migrate status    # exactamente 1 pendiente: 20261102120000_benefit_agreement_discount_scope
pnpm --filter api exec prisma migrate deploy
pnpm --filter api exec prisma migrate status    # 112, Database schema is up to date!
```

**STOP si** `status` muestra otra migration pendiente distinta de la de G10, o `deploy` falla. Nunca `migrate dev` / `reset`.  
El código G9 que sigue corriendo hasta el paso 11 tolera las columnas nuevas (nullable, sin defaults obligatorios).

## 11. Restart con código G10

```bash
sudo systemctl restart yti-api yti-web yti-scanner
sleep 15
```

Desde acá, los descuentos facturables se ven **sin contrato** hasta el paso 15 (fail-closed: nada se desactiva, nada se valúa con el contrato del local). Mantener el congelamiento económico.

## 12. Health check

```bash
systemctl is-active yti-api yti-web yti-scanner
curl -sS http://localhost:3001/health; echo                                   # {"status":"ok"}
curl -sS -o /dev/null -w "web %{http_code}\n" http://localhost:3000/
curl -sS -o /dev/null -w "scanner %{http_code}\n" http://localhost:3002/
journalctl -u yti-api --since "5 min ago" --no-pager | grep -iE "error|exception|can't resolve|UnknownDependencies|Prisma" | tail -40
journalctl -u yti-api --since "5 min ago" --no-pager | grep -E "economic-summary|pending-validations|discount-history" | head
journalctl -u yti-web --since "5 min ago" --no-pager | grep -iE "error|500|502" | tail -20
```

**Esperado:** active ×3, health ok, web / scanner 200 (o 307/308), sin errores de DI / Prisma; rutas G10 mapeadas.  
**STOP si** la API no arranca: § Rollback B (todavía es posible volver a G9).

## 13. Backfill DRY-RUN

```bash
cd /opt/yoteinvito
pnpm --filter api run benefit-agreements:backfill-discount-scope | tee /tmp/g10-backfill-dry-run.txt
pnpm --filter api run benefit-agreements:backfill-discount-scope -- --json > /tmp/g10-backfill-dry-run.json
```

Debe terminar con `DRY RUN — nothing written.`

## 14. Comparar contra A0

| Línea del reporte | Esperado (A0) | Diferencia material ⇒ STOP |
|---|---|---|
| `legacy agreements` | **17** | ≠ 17 sin explicación en el A0 de hoy |
| `profiles without agreements` | ≤ 6 y **todos** dentro de la lista A0 | cualquier ID fuera de la lista |
| `discounts without profile` | **0** | > 0 |
| `funded courtesies skipped` | **0** (= Q6 del A0 de hoy) | ≠ Q6 |
| `discounts without coverage` | solo `PROFILE_WITHOUT_AGREEMENTS` de locales de la lista A0 (incluye los 5 ACTIVE/APPROVED) | cualquier `LEGACY_OVERLAP` o `NO_SEGMENT_IN_LIFETIME`, o un local con agreement |
| `pending validations uncovered` | ≤ 11, solo en descuentos de los 6 locales sin agreement | pendientes sin cobertura en un local **con** agreement |
| `copies to insert` | > 0; cada copia `← <legacy del mismo local>`, `validFrom` ≥ alta del descuento | 0 copias, o una copia desde un legacy de otro local |
| `discounts with own agreements` | 0 | > 0 (alguien creó contratos durante la ventana) |

> **STOP CONDITION:** si el dry-run de producción difiere materialmente del A0 conocido ⇒ **STOP. NO `--confirm`.** Guardar `/tmp/g10-backfill-dry-run.*` y `/tmp/g10-a0-now.txt` y revisar antes de seguir. El sistema queda operable y fail-closed (descuentos sin contrato propio), y el rollback de código sigue disponible (§ Rollback B).

## 15. Backfill `--confirm`

```bash
pnpm --filter api run benefit-agreements:backfill-discount-scope -- --confirm | tee /tmp/g10-backfill-confirm.txt
```

**Esperado:** `Inserted: N` con N = `copies to insert` del paso 13; `Skipped at write: 0`. Solo INSERT (una transacción Serializable por local; audit `BENEFIT_AGREEMENT_CREATED` por copia, actor `system:g10-discount-agreement-backfill`).  
**STOP si** `Inserted` ≠ copias planeadas o hay `skippedAtWrite` (revisar motivo antes de cualquier otra acción).

## 16. Segundo dry-run

```bash
pnpm --filter api run benefit-agreements:backfill-discount-scope | tee /tmp/g10-backfill-dry-run-2.txt
```

**Esperado:** `copies to insert 0` · `already existing N` · resto de líneas iguales al paso 13.

## 17. Integrity checks

```bash
pnpm --filter api run benefit-settlements:audit-integrity | tee /tmp/g10-integrity.txt ; echo "exit=$?"
sudo -u postgres psql -d yo_te_invito -X -f /opt/yoteinvito/scripts/ops/g10-e4-post-backfill-verify-readonly.sql \
  | tee /tmp/g10-post-backfill-verify.txt
```

**Esperado:**

- CLI: `RESULT: OK` (exit 0), `agreementScopeIssues 0`; sin `AGREEMENT_SCOPE_MISMATCH`, `DISCOUNT_CASH_OVERPAYMENT`, `TRANSFER_DISCOUNT_SCOPE_MISMATCH`, `FUNDED_COURTESY_ALLOCATED`, `ALLOCATION_AGREEMENT_DISCOUNT_MISMATCH`. (Exit 2 = hay ERROR ⇒ revisar; la CLI nunca corrige datos.)
- SQL: V1 migration presente · V2 `PROFILE_LEGACY` = 17, `DISCOUNT` = N (todas `backfill_copies`) · V3 y V4 sin filas · V5 = N · V6 = solo descuentos de los locales sin agreement (≈ los 5 del A0) · V7 = 0 / 0 · V8 = 0.

## 18. Smoke HTTP

```bash
curl -sS https://api.yoteinvito.club/health; echo
curl -sS -o /dev/null -w "web %{http_code}\n" https://yoteinvito.club/
curl -sS -o /dev/null -w "scanner %{http_code}\n" https://scanner.yoteinvito.club/
curl -sS -o /dev/null -w "integrity sin auth %{http_code}\n" https://api.yoteinvito.club/admin/benefit-reporting/integrity   # 401
curl -sS -o /dev/null -w "gastro summary sin auth %{http_code}\n" https://api.yoteinvito.club/gastro/discounts/x/economic-summary   # 401
```

Con sesión ADMIN en el navegador (solo lectura): `/admin/liquidaciones`, `/admin/liquidaciones/acuerdos` (filtro Alcance = Legacy muestra las 17 filas read-only), detalle de un descuento con contrato copiado (sección «Contrato comercial» = Vigente, origen «copiado del contrato del local»), detalle de uno de los 5 descuentos sin cobertura (alerta «Sin contrato comercial vigente»), `GET /admin/benefit-reporting/integrity`. Fin del congelamiento económico.

## 19. QA manual

Recorrer [`V3_3_G10_MANUAL_QA_CHECKLIST.md`](../audits/V3_3_G10_MANUAL_QA_CHECKLIST.md) (ADMIN, GASTRO, cortesías, multi-descuento, multi-local, legacy, mobile, scanner). Las primeras operaciones reales (contratos de los 5 descuentos sin cobertura, asignaciones, pagos) cierran la ventana de rollback.

---

## Rollback

**No hay rollback destructivo prometido.** El backup del paso 2 es la red de seguridad; restaurarlo pierde todo lo escrito después.

| Momento | ¿Volver a G9? | Cómo |
|---|---|---|
| **A.** Antes del paso 10 (builds fallidos) | **Sí, trivial** | `git checkout ROLLBACK_SHA` → pasos 4–9 → `sudo systemctl restart yti-api yti-web yti-scanner`. La DB no cambió |
| **B.** Después del paso 10 y **antes** del paso 15, sin contratos por descuento creados | **Sí, solo código** | Verificar V7 = 0/0 y V2 sin filas `DISCOUNT` (SQL del paso 17). `git checkout ROLLBACK_SHA` → pasos 4–9 → restart. **La migration se deja aplicada**: es aditiva y nullable y el código G9 la ignora. No borrar columnas |
| **C.** Después del paso 15 (backfill confirmado) | **No seguro** | Forward-fix only. El código G9 resuelve contratos por `gastroProfileId` y vería las copias por descuento como contratos abiertos del local (varios CURRENT ⇒ gates y pricing incorrectos) |
| **D.** Después de las primeras operaciones G10 (contratos nuevos, allocations valuadas con contratos por descuento, transfers con `gastroDiscountId`) | **No** | Forward-fix only. Revertir perdería contratos, asignaciones y pagos reales |

`scripts/ops/g10-a1-rollback.sql` existe (borra filas por descuento, CHECKs, columnas y el registro de la migration) pero es **destructivo** y solo aplica con V7 = 0/0. No forma parte del procedimiento normal: usarlo únicamente con decisión explícita del operador, backup verificado y evaluando primero la restauración completa del backup.

## Registro del deploy (completar al ejecutar)

```text
ROLLBACK_SHA:
RELEASE_SHA:
Backup .sql.gz:
A0 de hoy igual al conocido:          SÍ / NO (detalle)
Dry-run copies to insert:
Confirm inserted / skipped:
Second dry-run copies:                0
Integrity RESULT / agreementScopeIssues:
Descuentos sin cobertura (V6):
QA manual:                            PENDIENTE / OK
```
