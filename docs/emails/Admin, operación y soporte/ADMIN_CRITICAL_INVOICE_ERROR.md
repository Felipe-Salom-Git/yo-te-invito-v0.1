# TEMPLATE_ID
`ADMIN_CRITICAL_INVOICE_ERROR`

## From
`operaciones@yoteinvito.club`

## Subject
Alerta crítica de facturación — {{errorType}}

## Preview text
Una factura no pudo emitirse o actualizarse correctamente.

## Body
Hola {{adminName}},

Se detectó un error crítico relacionado con facturación.

**Resumen del incidente**

- Severidad: {{severity}}
- Tipo de error: {{errorType}}
- Código: {{errorCode}}
- Fecha/hora: {{occurredAt}}
- Entorno: {{environment}}

**Entidad afectada**

- Orden: {{orderId}}
- Pago: {{paymentId}}
- Factura: {{invoiceId}}
- Entidad: {{entityType}} / {{entityId}}

{{#if errorMessage}}
**Mensaje registrado**

{{errorMessage}}
{{/if}}

**Acción sugerida**

Revisar el estado de la orden, confirmar si el pago fue aprobado y verificar si corresponde reintentar la emisión, registrar el fallo o iniciar una gestión manual.

## CTA principal
Ver caso en admin — {{adminUrl}}

## Footer corto/legal
Este email es una alerta operativa crítica de Yo Te Invito.  
No incluir credenciales, claves fiscales ni secretos en respuestas por email.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{adminName}}
{{severity}}
{{errorType}}
{{errorCode}}
{{occurredAt}}
{{environment}}
{{orderId}}
{{paymentId}}
{{invoiceId}}
{{entityType}}
{{entityId}}
{{errorMessage}}
{{adminUrl}}
{{currentYear}}
```
