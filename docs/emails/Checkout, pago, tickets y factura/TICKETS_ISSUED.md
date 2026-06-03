# Email Template — TICKETS_ISSUED

## ID

`TICKETS_ISSUED`

## From

`no_reply@yoteinvito.club`

## To

`{{userEmail}}`

## Subject

Tus tickets para {{eventTitle}} ya están disponibles

## Preview text

Ya podés ver tus tickets desde tu cuenta de Yo Te Invito.

## Body

Hola {{userName}},

Tus tickets para **{{eventTitle}}** ya fueron emitidos y están disponibles en tu cuenta.

**Información del evento**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Lugar: {{venueName}}
- Dirección: {{venueAddress}}
- Cantidad de tickets: {{ticketCount}}
- Orden: {{orderId}}

El día del evento, llevá tus tickets desde el celular o impresos. Cada ticket tiene un QR único y será validado en el acceso.

## CTA principal

Ver mis tickets → `{{ticketsUrl}}`

## Footer corto/legal

Este email fue enviado automáticamente por Yo Te Invito. No compartas tus tickets ni sus códigos QR con personas que no sean de confianza.

Para consultas, escribinos a {{supportEmail}} indicando tu número de orden {{orderId}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas

```txt
{{userName}}
{{userEmail}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{venueName}}
{{venueAddress}}
{{ticketCount}}
{{orderId}}
{{ticketsUrl}}
{{supportEmail}}
{{currentYear}}
```
