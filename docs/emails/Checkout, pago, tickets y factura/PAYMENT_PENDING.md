# Email Template — PAYMENT_PENDING

## ID

`PAYMENT_PENDING`

## From

`no_reply@yoteinvito.club`

## To

`{{userEmail}}`

## Subject

Tu pago está pendiente de confirmación

## Preview text

Estamos esperando la confirmación del pago de tu orden.

## Body

Hola {{userName}},

El pago de tu orden para **{{eventTitle}}** quedó en estado pendiente.

Esto puede suceder cuando el proveedor de pago todavía está procesando la operación. No hace falta que repitas la compra mientras el pago siga en revisión.

**Detalle de la operación**

- Orden: {{orderId}}
- Pago: {{paymentId}}
- Evento: {{eventTitle}}
- Total: {{currency}} {{amount}}
- Estado: {{paymentStatus}}

Te avisaremos cuando el pago sea aprobado, rechazado o expire.

## CTA principal

Ver estado de mi orden → `{{orderUrl}}`

## Footer corto/legal

Este email fue enviado automáticamente por Yo Te Invito. Si tenés dudas sobre tu pago, escribinos a {{supportEmail}} indicando tu número de orden {{orderId}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas

```txt
{{userName}}
{{userEmail}}
{{eventTitle}}
{{orderId}}
{{orderUrl}}
{{paymentId}}
{{paymentStatus}}
{{amount}}
{{currency}}
{{supportEmail}}
{{currentYear}}
```
