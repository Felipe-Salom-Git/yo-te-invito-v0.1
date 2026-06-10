# Slice 8.5 — Aplicación cambio de fecha

**Estado:** Implementado

- `applyInTransaction` — stock origen/destino + `ticket.occurrenceId`
- QR **sin regenerar** (`yti:v1:` id-only); scanner valida occurrence en BD
- Idempotencia si request ya `APPLIED`
