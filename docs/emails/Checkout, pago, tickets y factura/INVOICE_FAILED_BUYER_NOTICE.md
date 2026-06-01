# Email Template — INVOICE_FAILED_BUYER_NOTICE

## ID

`INVOICE_FAILED_BUYER_NOTICE`

## From

`no_reply@yoteinvito.club`

## To

`{{userEmail}}`

## Subject

Estamos revisando la factura de tu orden

## Preview text

Tu pago fue confirmado, pero la factura quedó pendiente de revisión.

## Body

Hola {{userName}},

Tu pago para **{{eventTitle}}** fue confirmado, pero la emisión de la factura de la orden **{{orderId}}** quedó pendiente de revisión.

Tus tickets no se ven afectados por esta situación si ya fueron emitidos. Nuestro equipo revisará el caso y te avisaremos cuando la factura esté disponible.

**Detalle**

- Orden: {{orderId}}
- Evento: {{eventTitle}}
- Total: {{currency}} {{amount}}
- Estado de factura: {{invoiceStatus}}

## CTA principal

Ver detalle de la orden → `{{orderUrl}}`

## Footer corto/legal

Este email fue enviado automáticamente por Yo Te Invito. Para consultas sobre facturación, escribinos a {{supportEmail}} indicando tu número de orden {{orderId}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas

```txt
{{userName}}
{{userEmail}}
{{eventTitle}}
{{orderId}}
{{orderUrl}}
{{amount}}
{{currency}}
{{invoiceStatus}}
{{supportEmail}}
{{currentYear}}
```
