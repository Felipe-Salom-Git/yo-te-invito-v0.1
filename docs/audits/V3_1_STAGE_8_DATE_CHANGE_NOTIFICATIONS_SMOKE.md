# Slice 8.6 — Notificaciones cambio de fecha

**Estado:** Implementado

- `NotificationKind`: `TICKET_DATE_CHANGE_*`
- Email templates: `TICKET_DATE_CHANGE_REQUESTED`, `_PENDING_PRODUCER`, `_APPLIED`, `_REJECTED`
- `TicketDateChangeNotificationsService` — fallo email no bloquea flujo
- Labels en `/me/notifications`
