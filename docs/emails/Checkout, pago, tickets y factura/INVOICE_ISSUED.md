# Email Template — INVOICE_ISSUED

## ID

`INVOICE_ISSUED`

## From

`no_reply@yoteinvito.club`

## To

`{{userEmail}}`

## Subject

Tu factura de Yo Te Invito ya está disponible

## Preview text

La factura correspondiente a tu orden ya fue emitida.

## Body

Hola {{userName}},

La factura correspondiente a tu orden **{{orderId}}** ya fue emitida y está disponible para descargar.

**Detalle**

- Orden: {{orderId}}
- Evento: {{eventTitle}}
- Total: {{currency}} {{amount}}
- Estado de factura: {{invoiceStatus}}

Podés acceder a la factura desde el detalle de tu orden.

## CTA principal

Ver factura → `{{invoiceUrl}}`

## Footer corto/legal

Este email fue enviado automáticamente por Yo Te Invito. Para consultas sobre facturación, escribinos a {{supportEmail}} indicando tu número de orden {{orderId}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas

```txt
{{userName}}
{{userEmail}}
{{orderId}}
{{eventTitle}}
{{amount}}
{{currency}}
{{invoiceStatus}}
{{invoiceUrl}}
{{supportEmail}}
{{currentYear}}
```
