# V3.1 Etapa 10 — Slice 10.7 — Fallback horario legacy

## Regla final

| Condición | Ficha pública | Abierto/cerrado |
|-----------|---------------|-----------------|
| `mode=weekly` + datos semanales | Listado lun–dom | Sí |
| `mode=weekly` sin datos semanales | Fallback a `openingHours` simple | No |
| `mode=simple` + `openingHours` | Formato rental (Lun–Vie / Sáb / Dom) | No |
| Sin horarios | «Horarios no informados» | No |

## Formularios

- Editar local legacy: precarga simple; no borra `openingHours` al guardar
- Cambiar a weekly: envía `openingHoursWeekly`; `openingHours` permanece en BD
- Volver a simple: `openingHoursWeekly=null` en payload; datos simple intactos

## Backend

- Sin normalización destructiva en lectura/escritura
- `openingHoursMode` default `simple` en migración para filas existentes
