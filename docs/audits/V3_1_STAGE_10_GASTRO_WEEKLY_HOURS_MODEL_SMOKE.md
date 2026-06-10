# V3.1 Etapa 10 — Slice 10.2 — Modelo horario semanal (smoke)

**Comando:** `pnpm --filter api run smoke:v31-gastro-weekly-hours`

## Modelo

| Campo | Tipo | Default |
|-------|------|---------|
| `openingHoursMode` | `simple \| weekly` | `simple` |
| `openingHoursWeekly` | JSONB días lun–dom | `null` |
| `openingHours` | JSONB rental (legacy/simple) | sin cambio |
| `openingHoursNote` | TEXT | sin cambio |

Migración: `20260615120000_gastro_weekly_opening_hours`

## Schemas shared

- `packages/shared/src/schemas/gastro-weekly-opening-hours.ts`
- Extendido `gastro-locations.ts`, `admin-gastro.ts`

## Helpers API

- `readGastroOpeningHoursFields`, `writeGastroOpeningHoursMode`, `writeGastroOpeningHoursWeekly` en `gastro-profile-fields.util.ts`

## Smoke (2026-06-10)

| Caso | Resultado |
|------|-----------|
| Horario simple legacy | OK |
| Horario semanal múltiples franjas | OK |
| Franja nocturna 20:00–02:00 | OK |
| Solapamiento rechazado | OK |
| Roundtrip DB | OK |
