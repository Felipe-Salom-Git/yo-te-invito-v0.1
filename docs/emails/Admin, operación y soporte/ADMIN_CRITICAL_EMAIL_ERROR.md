# TEMPLATE_ID
`ADMIN_CRITICAL_EMAIL_ERROR`

## From
`operaciones@yoteinvito.club`

## Subject
Fallo en email crítico — {{emailTemplateId}}

## Preview text
Un email transaccional crítico no pudo enviarse correctamente.

## Body
Hola {{adminName}},

Se detectó un fallo al enviar un email crítico de Yo Te Invito.

**Resumen**

- Template: {{emailTemplateId}}
- Severidad: {{severity}}
- Código de error: {{errorCode}}
- Fecha/hora: {{occurredAt}}
- Entorno: {{environment}}

**Destino**

- Usuario: {{userName}}
- Email: {{userEmail}}

**Entidad relacionada**

- Tipo: {{entityType}}
- ID: {{entityId}}
- Orden: {{orderId}}

{{#if errorMessage}}
**Mensaje registrado**

{{errorMessage}}
{{/if}}

**Acción sugerida**

Revisar logs de entrega, proveedor de email, reintentos configurados y si corresponde reenviar manualmente el email crítico.

## CTA principal
Ver logs en admin — {{adminUrl}}

## Footer corto/legal
Este email es una alerta operativa interna de Yo Te Invito.  
No responder con credenciales, tokens ni secretos del proveedor de email.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{adminName}}
{{emailTemplateId}}
{{severity}}
{{errorCode}}
{{occurredAt}}
{{environment}}
{{userName}}
{{userEmail}}
{{entityType}}
{{entityId}}
{{orderId}}
{{errorMessage}}
{{adminUrl}}
{{currentYear}}
```
