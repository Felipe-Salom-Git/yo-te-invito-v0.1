# Slice 8.3 — Elegibilidad cambio de fecha

**Estado:** Implementado

- `TicketDateChangeEligibilityService` — validaciones centralizadas
- `GET /me/tickets/:ticketId/date-change-options`
- UI consume opciones y oculta acción si `canRequest=false`
- Smoke: `pnpm --filter api run smoke:v31-ticket-date-change-eligibility`
