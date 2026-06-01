# Yo Te Invito — Emails V1 — Tanda 4
## Productoras y estado de eventos

Esta tanda cubre emails transaccionales y operativos vinculados a la gestión de eventos desde el portal productor y la revisión administrativa.

## Emails incluidos

| ID | Archivo | Uso |
|---|---|---|
| `PRODUCER_EVENT_SUBMITTED` | `PRODUCER_EVENT_SUBMITTED.md` | Confirmar que un evento fue enviado a revisión. |
| `PRODUCER_EVENT_APPROVED` | `PRODUCER_EVENT_APPROVED.md` | Avisar que el evento fue aprobado por administración. |
| `PRODUCER_EVENT_REJECTED` | `PRODUCER_EVENT_REJECTED.md` | Avisar que el evento fue rechazado. |
| `PRODUCER_EVENT_NEEDS_CHANGES` | `PRODUCER_EVENT_NEEDS_CHANGES.md` | Solicitar ajustes antes de aprobar/publicar. |
| `PRODUCER_EVENT_PUBLISHED` | `PRODUCER_EVENT_PUBLISHED.md` | Confirmar que el evento quedó visible públicamente. |
| `PRODUCER_EVENT_LOW_STOCK` | `PRODUCER_EVENT_LOW_STOCK.md` | Alertar que quedan pocas entradas en una tanda/tipo de ticket. |
| `PRODUCER_EVENT_SOLD_OUT` | `PRODUCER_EVENT_SOLD_OUT.md` | Avisar que el evento o una tanda se agotó. |
| `PRODUCER_EVENT_SALES_SUMMARY` | `PRODUCER_EVENT_SALES_SUMMARY.md` | Resumen operativo de ventas del evento. |
| `PRODUCER_COURTESY_GRANTED_SUMMARY` | `PRODUCER_COURTESY_GRANTED_SUMMARY.md` | Resumen de cortesías generadas. |

## Criterio de tono

- Profesional, claro y operativo.
- Cercano sin perder formalidad.
- No prometer publicación si el estado todavía depende de revisión.
- Separar claramente aprobación, publicación y visibilidad pública.
- En rechazos o ajustes, mantener tono constructivo y orientado a acción.

## Remitente sugerido

`operaciones@yoteinvito.club`

## Variables globales recomendadas

```txt
{{appName}}
{{brandName}}
{{producerName}}
{{supportEmail}}
{{operationsEmail}}
{{baseUrl}}
{{dashboardUrl}}
{{currentYear}}
```

## Variables específicas frecuentes

```txt
{{eventTitle}}
{{eventId}}
{{eventUrl}}
{{producerEventUrl}}
{{adminReason}}
{{reviewNotes}}
{{requiredChanges}}
{{publishedAt}}
{{eventDate}}
{{eventTime}}
{{venueName}}
{{ticketTypeName}}
{{batchName}}
{{availableTickets}}
{{soldTickets}}
{{totalTickets}}
{{salesAmount}}
{{currency}}
{{courtesyCount}}
{{courtesyMode}}
```
