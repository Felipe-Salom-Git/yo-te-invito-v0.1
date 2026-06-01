# Email Template — ORDER_CREATED_PENDING_PAYMENT

## ID

`ORDER_CREATED_PENDING_PAYMENT`

## From

`no_reply@yoteinvito.club`

## To

`{{userEmail}}`

## Subject

Tu orden en Yo Te Invito fue creada

## Preview text

Guardamos tu orden. Completá el pago para confirmar tus tickets.

## Body

Hola {{userName}},

Creamos tu orden para **{{eventTitle}}**.

Tu compra todavía no está confirmada. Para asegurar tus tickets, completá el pago desde el enlace de la orden.

**Resumen de la orden**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Lugar: {{venueName}}
- Orden: {{orderId}}
- Total: {{currency}} {{amount}}
- Estado actual: {{paymentStatus}}

Si ya realizaste el pago, puede demorar unos minutos en verse reflejado.

## CTA principal

Ver orden y completar pago → `{{orderUrl}}`

## Footer corto/legal

Este email fue enviado automáticamente por Yo Te Invito. Si no reconocés esta operación, escribinos a {{supportEmail}}.

Yo Te Invito no solicita contraseñas, códigos de acceso ni datos sensibles por email.

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
{{paymentStatus}}
{{amount}}
{{currency}}
{{supportEmail}}
{{currentYear}}
```
