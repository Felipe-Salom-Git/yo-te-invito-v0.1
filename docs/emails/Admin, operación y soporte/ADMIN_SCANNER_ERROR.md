# TEMPLATE_ID
`ADMIN_SCANNER_ERROR`

## From
`operaciones@yoteinvito.club`

## Subject
Alerta de scanner — {{errorType}}

## Preview text
Se detectó un error o anomalía vinculada al scanner de tickets.

## Body
Hola {{adminName}},

Se detectó una alerta vinculada al scanner de Yo Te Invito.

**Resumen**

- Severidad: {{severity}}
- Tipo de alerta: {{errorType}}
- Código: {{errorCode}}
- Fecha/hora: {{occurredAt}}
- Entorno: {{environment}}

**Datos relacionados**

- Evento: {{eventTitle}}
- Ticket: {{ticketId}}
- Dispositivo scanner: {{scannerDeviceId}}
- Entidad: {{entityType}} / {{entityId}}

{{#if errorMessage}}
**Mensaje registrado**

{{errorMessage}}
{{/if}}

**Acción sugerida**

Revisar logs del scanner, estado del ticket, evento asociado y posibles intentos duplicados o inconsistentes.

## CTA principal
Ver auditoría/admin — {{adminUrl}}

## Footer corto/legal
Este email es una alerta operativa interna de Yo Te Invito.  
No compartir información sensible del ticket por canales no autorizados.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{adminName}}
{{severity}}
{{errorType}}
{{errorCode}}
{{occurredAt}}
{{environment}}
{{eventTitle}}
{{ticketId}}
{{scannerDeviceId}}
{{entityType}}
{{entityId}}
{{errorMessage}}
{{adminUrl}}
{{currentYear}}
```
