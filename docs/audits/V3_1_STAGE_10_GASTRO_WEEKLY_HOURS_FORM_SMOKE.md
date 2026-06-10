# V3.1 Etapa 10 — Slice 10.3 — Formulario horario por día (smoke)

## Componente

`apps/web/components/forms/WeeklyOpeningHoursEditor.tsx`

## Integración

- `GastroLocalForm` — portal `/gastro/local/editar` y admin `/admin/gastronomicos/*`
- Toggle: **Usar horario simple** / **Configurar por día**

## QA manual

| Caso | Esperado |
|------|----------|
| Local legacy abre formulario | Precarga modo simple + horario rental |
| Guardar simple | `openingHoursMode=simple`, weekly null |
| Cambiar a avanzado | Editor por día visible |
| Día cerrado | Array vacío |
| Guardar y reabrir | Datos precargados |

## Build

`pnpm --filter web run build` — OK 2026-06-10
