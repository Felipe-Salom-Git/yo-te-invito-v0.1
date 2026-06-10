# V3.1 Etapa 10 — Gastronomía: horarios avanzados — Cierre

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`

## 1. Objetivo

Horarios gastronómicos avanzados por día de la semana, manteniendo compatibilidad con el formato simple actual (weekday/sábado/domingo).

## 2. Slices ejecutados

| Slice | Entregable |
|-------|------------|
| 10.1 | Auditoría `V3_1_STAGE_10_GASTRO_HOURS_AUDIT.md` |
| 10.2 | Modelo Prisma + shared + API + smoke |
| 10.3 | `WeeklyOpeningHoursEditor` + `GastroLocalForm` |
| 10.4 | Múltiples franjas + nocturno + solapamiento |
| 10.5 | Copiar horarios entre días |
| 10.6 | Abierto/cerrado + listado público |
| 10.7 | Fallback legacy |
| 10.8 | Este documento + checklist §27 |

## 3. Modelo final

- `openingHours` — simple (`RentalOpeningHours`)
- `openingHoursWeekly` — `{ monday..sunday: { open, close }[] }`
- `openingHoursMode` — `simple | weekly`
- `openingHoursNote` — nota compartida

## 4. Validaciones

- HH:mm, máx. 4 franjas/día, sin solapamiento, nocturno permitido

## 5–8. UI

- Admin y portal: toggle simple/avanzado
- Ficha pública: `GastroOpeningHoursSummary` con badge si weekly

## 9. Abierto/cerrado

Solo con horario weekly; timezone Argentina.

## 10. Fallback legacy

Ver `V3_1_STAGE_10_GASTRO_HOURS_LEGACY_FALLBACK.md`

## 11. QA ejecutado

| Check | Resultado |
|-------|-----------|
| `pnpm --filter shared run build` | OK |
| `pnpm --filter api run build` | OK |
| `pnpm --filter web run build` | OK |
| `smoke:v31-gastro-weekly-hours` | OK |
| Migración deploy local | OK |

## 12. Pendientes / riesgos

- QA manual mobile en dispositivo real (formulario + modal copiar)
- JSON-LD `openingHours` en SEO no actualizado en este slice
- Horario simple no calcula abierto/cerrado (por diseño — texto agrupado no siempre parseable)
