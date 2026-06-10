# Slice 8.2 — Solicitud cambio de fecha

**Estado:** Implementado

- Modelo `TicketDateChangeRequest` + migración `20260618120000_ticket_date_change`
- `POST /me/tickets/:ticketId/date-change-requests`
- UI `TicketDateChangePanel` en `/me/tickets/[ticketId]`
- Auto-aprobación cuando reglas lo permiten
