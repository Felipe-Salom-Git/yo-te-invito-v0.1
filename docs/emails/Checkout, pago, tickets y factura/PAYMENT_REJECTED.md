# Email Template — PAYMENT_REJECTED

## ID

`PAYMENT_REJECTED`

## From

`no_reply@yoteinvito.club`

## To

`{{userEmail}}`

## Subject

No pudimos confirmar el pago de tu orden

## Preview text

El pago fue rechazado o no pudo completarse. Podés revisar tu orden desde tu cuenta.

## Body

Hola {{userName}},

No pudimos confirmar el pago de tu orden para **{{eventTitle}}**.

La operación figura como **{{paymentStatus}}**. Esto puede ocurrir por distintos motivos relacionados con el medio de pago o con la validación del proveedor.

**Detalle de la operación**

- Orden: {{orderId}}
- Pago: {{paymentId}}
- Evento: {{eventTitle}}
- Total: {{currency}} {{amount}}
- Estado: {{paymentStatus}}

Tus tickets no se emitirán hasta que el pago esté aprobado.

## CTA principal

Revisar mi orden → `{{orderUrl}}`

## Footer corto/legal

Este email fue enviado automáticamente por Yo Te Invito. Si necesitás ayuda, escribinos a {{supportEmail}} indicando tu número de orden {{orderId}}.

Yo Te Invito no solicita contraseñas, códigos ni datos completos de tarjetas por email.

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
