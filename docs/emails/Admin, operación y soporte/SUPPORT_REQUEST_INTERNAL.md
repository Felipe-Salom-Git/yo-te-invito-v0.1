# TEMPLATE_ID
`SUPPORT_REQUEST_INTERNAL`

## From
`soporte@yoteinvito.club`

## Subject
Nueva consulta de soporte — {{caseSubject}}

## Preview text
Un usuario envió una nueva consulta que requiere revisión.

## Body
Hola equipo,

Se registró una nueva consulta de soporte en Yo Te Invito.

**Datos del caso**

- Caso: {{caseId}}
- Asunto: {{caseSubject}}
- Estado: {{caseStatus}}
- Usuario: {{userName}}
- Email: {{userEmail}}
- Fecha/hora: {{occurredAt}}

{{#if messagePreview}}
**Mensaje**

{{messagePreview}}
{{/if}}

Revisar si corresponde responder desde soporte, derivar a operaciones o asociar el caso a una orden/evento.

## CTA principal
Ver caso — {{caseUrl}}

## Footer corto/legal
Este email es una notificación interna de soporte de Yo Te Invito.  
No reenviar datos personales fuera de los canales autorizados.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{caseId}}
{{caseSubject}}
{{caseStatus}}
{{userName}}
{{userEmail}}
{{occurredAt}}
{{messagePreview}}
{{caseUrl}}
{{currentYear}}
```
