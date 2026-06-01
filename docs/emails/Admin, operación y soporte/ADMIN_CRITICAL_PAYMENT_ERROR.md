# TEMPLATE_ID
`ADMIN_CRITICAL_PAYMENT_ERROR`

## From
`operaciones@yoteinvito.club`

## Subject
Alerta crítica de pago — {{errorType}}

## Preview text
Se detectó un error crítico vinculado a pago, webhook o reconciliación.

## Body
Hola {{adminName}},

Se detectó un error crítico relacionado con pagos en Yo Te Invito.

**Resumen del incidente**

- Severidad: {{severity}}
- Tipo de error: {{errorType}}
- Código: {{errorCode}}
- Fecha/hora: {{occurredAt}}
- Entorno: {{environment}}

**Entidad afectada**

- Orden: {{orderId}}
- Pago: {{paymentId}}
- Webhook: {{webhookId}}
- Entidad: {{entityType}} / {{entityId}}

{{#if errorMessage}}
**Mensaje registrado**

{{errorMessage}}
{{/if}}

**Acción sugerida**

Revisar el detalle de la orden, el estado del pago, logs del webhook y registros de auditoría antes de realizar cualquier corrección manual.

## CTA principal
Ver detalle en admin — {{adminUrl}}

## Footer corto/legal
Este email es una alerta operativa crítica de Yo Te Invito.  
No responder con credenciales, secretos ni datos sensibles por email.

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
{{webhookId}}
{{entityType}}
{{entityId}}
{{errorMessage}}
{{adminUrl}}
{{currentYear}}
```
