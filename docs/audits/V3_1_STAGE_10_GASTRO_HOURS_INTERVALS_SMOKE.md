# V3.1 Etapa 10 — Slice 10.4 — Múltiples franjas por día (smoke)

## Validación

- Máx. 4 franjas por día (`GASTRO_WEEKLY_MAX_INTERVALS_PER_DAY`)
- Formato `HH:mm`
- Franja nocturna: `close <= open` cruza medianoche (ej. 20:00–02:00)
- Solapamiento intra-día rechazado en `gastroWeeklyOpeningHoursSchema`

## UI

- Botón **+ Agregar franja** por día en `WeeklyOpeningHoursEditor`
- Botón **Quitar** si hay más de una franja

## Smoke API

Incluido en `smoke:v31-gastro-weekly-hours` — múltiples franjas martes + sábado nocturno.
