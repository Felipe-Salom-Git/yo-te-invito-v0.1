# Yo Te Invito — Emails V1 — Tanda 3
## Transferencias, recordatorios y cambios de evento

Esta tanda cubre emails transaccionales y operativos vinculados a:

- Transferencias personales de tickets.
- Confirmaciones de aceptación/rechazo/cancelación de transferencias.
- Recordatorios previos al evento.
- Eventos cancelados o reprogramados.

## Emails incluidos

| ID | Archivo | Uso |
|---|---|---|
| `TICKET_TRANSFER_RECEIVED` | `TICKET_TRANSFER_RECEIVED.md` | Avisar al receptor que recibió una transferencia de ticket. |
| `TICKET_TRANSFER_SENT` | `TICKET_TRANSFER_SENT.md` | Confirmar al emisor que envió una transferencia. |
| `TICKET_TRANSFER_ACCEPTED_SENDER` | `TICKET_TRANSFER_ACCEPTED_SENDER.md` | Avisar al emisor que la transferencia fue aceptada. |
| `TICKET_TRANSFER_ACCEPTED_RECEIVER` | `TICKET_TRANSFER_ACCEPTED_RECEIVER.md` | Confirmar al receptor que el ticket ya está en su cuenta. |
| `TICKET_TRANSFER_REJECTED` | `TICKET_TRANSFER_REJECTED.md` | Avisar al emisor que la transferencia fue rechazada. |
| `TICKET_TRANSFER_CANCELLED` | `TICKET_TRANSFER_CANCELLED.md` | Avisar al receptor que la transferencia fue cancelada. |
| `TICKET_TRANSFER_EXPIRED` | `TICKET_TRANSFER_EXPIRED.md` | Avisar que la transferencia venció. |
| `EVENT_REMINDER_24H` | `EVENT_REMINDER_24H.md` | Recordatorio 24 h antes del evento. |
| `EVENT_CANCELLED_BUYER` | `EVENT_CANCELLED_BUYER.md` | Aviso crítico de evento cancelado. |
| `EVENT_RESCHEDULED_BUYER` | `EVENT_RESCHEDULED_BUYER.md` | Aviso crítico de evento reprogramado. |

## Criterio de tono

- Profesional, cercano y confiable.
- Claro en estados: enviado, aceptado, rechazado, cancelado o vencido.
- Sin lenguaje informal excesivo.
- Sin prometer reembolsos automáticos si no están confirmados por operación.
- En cancelaciones/reprogramaciones, derivar siempre al detalle de orden o soporte.

## Remitentes sugeridos

| Tipo | From |
|---|---|
| Transferencias y recordatorios automáticos | `no_reply@yoteinvito.club` |
| Cancelación/reprogramación con operación involucrada | `operaciones@yoteinvito.club` |
| Soporte visible | `soporte@yoteinvito.club` |

## Variables globales recomendadas

```txt
{{appName}}
{{brandName}}
{{userName}}
{{supportEmail}}
{{baseUrl}}
{{loginUrl}}
{{dashboardUrl}}
{{ticketsUrl}}
{{emailPreferencesUrl}}
{{currentYear}}
```

## Variables específicas frecuentes

```txt
{{senderName}}
{{recipientName}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{venueName}}
{{venueAddress}}
{{ticketId}}
{{transferUrl}}
{{transferExpiresAt}}
{{ticketsUrl}}
{{orderUrl}}
{{eventUrl}}
{{newEventDate}}
{{newEventTime}}
{{oldEventDate}}
{{oldEventTime}}
{{cancellationReason}}
{{rescheduleReason}}
```
