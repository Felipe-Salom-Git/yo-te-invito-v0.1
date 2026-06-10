# V3.1 Etapa 12 — Slice 12.4 — Maps excursiones

## Estado

Maps excursiones ya implementados en etapas previas. Este slice documenta cierre + copy UX.

## Campos / flujos existentes

- Operador: `RentalLocationFields` + `LocationPickerMap` en admin operador.
- Excursión: `EventLocationFields` opcional (override vs operador).
- Público: `resolveExcursionPublicLocation`, `ExcursionSchedulePublicSections`, `EventLocationModal`.
- Schemas: `excursionProductLocationInputSchema`, `meetingPoint` en schedule.

## Ajuste Slice 12.4

- CTA mapa unificado: **「Ver ubicación」** (antes 「Ver en mapa」).

## QA

| Caso | Estado |
|------|--------|
| Crear/editar con ubicación | Manual |
| Fallback manual sin API key | Manual |
| Detalle público + modal | Manual |
| Sin ubicación → sin bloque vacío | OK en código |

## Comandos

- `pnpm --filter web run build` — PASS
