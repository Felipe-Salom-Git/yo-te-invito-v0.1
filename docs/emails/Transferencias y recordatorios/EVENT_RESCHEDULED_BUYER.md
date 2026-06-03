# TEMPLATE_ID
`EVENT_RESCHEDULED_BUYER`

## From
`operaciones@yoteinvito.club`

## Subject
Nueva fecha para {{eventTitle}}

## Preview text
El evento fue reprogramado. Revisá la nueva fecha y los detalles actualizados.

## Body
Hola {{userName}},

Te informamos que **{{eventTitle}}** fue reprogramado.

**Fecha anterior**

- Fecha: {{oldEventDate}}
- Hora: {{oldEventTime}}

**Nueva fecha**

- Fecha: {{newEventDate}}
- Hora: {{newEventTime}}
- Lugar: {{venueName}}
- Dirección: {{venueAddress}}

{{#if rescheduleReason}}
**Motivo informado:**  
{{rescheduleReason}}
{{/if}}

Tu ticket seguirá asociado al evento actualizado, salvo que se indique lo contrario en el detalle de tu orden o en una comunicación posterior.

## CTA principal
Ver detalle de mi orden — {{orderUrl}}

## Footer corto/legal
Este email contiene información importante sobre un evento asociado a tu compra.  
Para consultas, escribinos a {{supportEmail}} indicando tu orden {{orderId}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{userName}}
{{eventTitle}}
{{oldEventDate}}
{{oldEventTime}}
{{newEventDate}}
{{newEventTime}}
{{venueName}}
{{venueAddress}}
{{rescheduleReason}}
{{orderUrl}}
{{orderId}}
{{supportEmail}}
{{currentYear}}
```
