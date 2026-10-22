# V3.3 G7.1 — BenefitSettlement unique constraint review

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation`  
**Decisión:** **NO crear migration nueva**

## Pregunta

¿Falta unicidad `tenant + vertical + partner + periodKey`?

## Evidencia

### Prisma schema (`BenefitSettlement`)

Solo índices no únicos:

```text
@@index([tenantId, vertical, gastroProfileId, periodKey])
@@index([tenantId, vertical, excursionOperatorId, periodKey])
```

Prisma **no** declara `@@unique` dual nullable (limitación conocida Etapa 9).

### Migration SQL existente

`apps/api/prisma/migrations/20260901140000_benefit_settlement_domain/migration.sql`:

```sql
CREATE UNIQUE INDEX "BenefitSettlement_tenant_gastro_period_key"
  ON "BenefitSettlement"("tenantId", "gastroProfileId", "periodKey")
  WHERE "vertical" = 'GASTRO' AND "gastroProfileId" IS NOT NULL;

CREATE UNIQUE INDEX "BenefitSettlement_tenant_activity_period_key"
  ON "BenefitSettlement"("tenantId", "excursionOperatorId", "periodKey")
  WHERE "vertical" = 'ACTIVITY' AND "excursionOperatorId" IS NOT NULL;
```

### Conclusión

La unicidad **ya está garantizada en PostgreSQL** mediante partial unique indexes:

| Vertical | Columns | Predicate |
|---|---|---|
| GASTRO | tenantId, gastroProfileId, periodKey | vertical=GASTRO AND gastroProfileId IS NOT NULL |
| ACTIVITY | tenantId, excursionOperatorId, periodKey | vertical=ACTIVITY AND excursionOperatorId IS NOT NULL |

Crear un `@@unique` Prisma adicional o una migration nueva **duplicaría** el constraint y arriesgaría fallos en apply.

**G7.1 cerrada sin cambios de schema.**

## Nota

Si en algún entorno la migration `20260901140000` no estuviera aplicada, el índice no existiría — eso es ops/deploy de Etapa 9, no un gap de G7.
