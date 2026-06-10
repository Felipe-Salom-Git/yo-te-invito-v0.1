# V3.1 Etapa 10 — Slice 10.5 — Copiar horarios entre días (smoke)

## UX

Modal **Copiar a…** por día en `WeeklyOpeningHoursEditor`:

- Cada día de la semana
- **Lunes a viernes**
- **Todos los días**
- Confirmación implícita al elegir destino; **Cancelar** cierra sin cambios
- Feedback: «Horario copiado.»

## Alcance

100% frontend — sin cambios backend adicionales.

## QA manual

| Caso | Esperado |
|------|----------|
| Copiar lunes → martes | Solo martes actualizado |
| Copiar lunes → lunes-viernes | Lun–vie iguales |
| Copiar día cerrado | Destinos quedan cerrados |
| Cancelar | Sin cambios |
