# Email Template — PAYMENT_APPROVED

## ID

`PAYMENT_APPROVED`

## From

`no_reply@yoteinvito.club`

## To

`{{userEmail}}`

## Subject

Pago confirmado para {{eventTitle}}

## Preview text

Tu pago fue aprobado. Ya estamos preparando tus tickets.

## Body

Hola {{userName}},

¡Tu pago fue aprobado!

Confirmamos la compra para **{{eventTitle}}**. Tus tickets estarán disponibles en tu cuenta y también te enviaremos la información correspondiente por email.

**Resumen de compra**

- Orden: {{orderId}}
- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Lugar: {{venueName}}
- Tickets: {{ticketCount}}
- Total pagado: {{currency}} {{amount}}

Conservá este email como comprobante de la operación.

## CTA principal

Ver mi orden → `{{orderUrl}}`

## Footer corto/legal

Este email fue enviado automáticamente por Yo Te Invito. Para consultas sobre tu compra, escribinos a {{supportEmail}} indicando tu número de orden {{orderId}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas

```txt
{{userName}}
{{userEmail}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{venueName}}
{{orderId}}
{{orderUrl}}
{{ticketCount}}
{{amount}}
{{currency}}
{{supportEmail}}
{{currentYear}}
```
