# TEMPLATE_ID
`EVENT_CANCELLED_BUYER`

## From
`operaciones@yoteinvito.club`

## Subject
Evento cancelado: {{eventTitle}}

## Preview text
El evento fue cancelado. Revisá el detalle de tu orden para más información.

## Body
Hola {{userName}},

Te informamos que **{{eventTitle}}** fue cancelado.

Sabemos que este tipo de cambios puede generar inconvenientes. Por eso, te recomendamos revisar el detalle de tu orden para ver la información disponible y próximos pasos.

**Detalles del evento**

- Evento: {{eventTitle}}
- Fecha original: {{eventDate}}
- Hora original: {{eventTime}}
- Lugar: {{venueName}}

{{#if cancellationReason}}
**Motivo informado:**  
{{cancellationReason}}
{{/if}}

Si corresponde una gestión adicional sobre tu compra, la información se actualizará desde Yo Te Invito o será comunicada por los canales correspondientes.

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
{{eventDate}}
{{eventTime}}
{{venueName}}
{{cancellationReason}}
{{orderUrl}}
{{orderId}}
{{supportEmail}}
{{currentYear}}
```
