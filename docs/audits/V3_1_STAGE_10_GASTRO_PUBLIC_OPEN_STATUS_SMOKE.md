# V3.1 Etapa 10 — Slice 10.6 — Abierto/cerrado ficha pública (smoke)

## Helper

- Shared: `getGastroWeeklyOpenStatus` — timezone `America/Argentina/Buenos_Aires`
- Web: `lib/gastro/openingHoursDisplay.ts` → `getGastroOpenStatus`

## UI pública

`GastroOpeningHoursSummary` + `GastroLocationCard`:

- Badge **Abierto ahora** / **Cerrado** (solo modo weekly con datos)
- Listado día a día en modo weekly
- Modo simple: horario rental sin badge abierto/cerrado

## Rutas

- `/restaurants/[id]`
- `/gastronomicos/[id]`

## Build

`pnpm --filter web run build` — OK 2026-06-10
