# V3.1 Slice 11 — Producer event wizard smoke

**Fecha:** 2026-06-14  
**Alcance:** Wizard 3 pasos en creación y edición productora. Sin backend/Prisma.

## Decisión

- **Creación + edición** comparten wizard (`ProducerEventWizardProgress` + `wizardStep` en `ProducerEventFormFields`).
- **Reutilización:** misma lógica de submit (`validateProducerEventForm`, `validateProducerEventSubmit`, mutations existentes).
- **Ticket types/tandas:** fuera del wizard — siguen en `/producer/events/[id]` post-guardado.

## Pasos

| Paso | Contenido |
|------|-----------|
| 1 — Datos | Título, resumen, descripción, subcategoría |
| 2 — Fecha y lugar | Fechas, venue, maps, capacidad (ticketed), nota entradas |
| 3 — Imagen y envío | Cover GCS, completitud, estado (edit), aviso legal (Slice 12) |

## Validación por paso

- Paso 1: título + longitud resumen.
- Paso 2: `startAt`, fin ≥ inicio.
- Paso 3 / submit: validación completa (+ ubicación si `pending` en edit).

## Rutas QA manual

| Ruta | Verificar |
|------|-----------|
| `/producer/events/new?mode=ticketed` | Wizard 3 pasos, Siguiente/Atrás, crear borrador |
| `/producer/events/new?mode=publicity` | Idem modo publicidad |
| `/producer/events/[id]/edit` | Datos cargados, navegación sin perder estado, enviar a revisión |
| Mobile 360px | Progress bar, botones apilados |

## Comandos

```bash
pnpm exec nx run web:lint
pnpm exec nx run web:build
```
