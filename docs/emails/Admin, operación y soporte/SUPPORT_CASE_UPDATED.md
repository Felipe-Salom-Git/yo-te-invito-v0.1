# TEMPLATE_ID
`SUPPORT_CASE_UPDATED`

## From
`soporte@yoteinvito.club`

## Subject
Actualización de tu caso {{caseId}}

## Preview text
Hay una nueva actualización sobre tu consulta en Yo Te Invito.

## Body
Hola {{userName}},

Tenemos una actualización sobre tu caso de soporte.

**Detalle del caso**

- Caso: {{caseId}}
- Asunto: {{caseSubject}}
- Estado actual: {{caseStatus}}

{{#if caseUpdateMessage}}
**Actualización**

{{caseUpdateMessage}}
{{/if}}

Podés revisar el estado del caso o responder con información adicional si lo necesitás.

## CTA principal
Ver mi caso — {{caseUrl}}

## Footer corto/legal
Este email informa una actualización sobre tu consulta en Yo Te Invito.  
Para agregar información, respondé a este correo o escribinos a {{supportEmail}} indicando el caso {{caseId}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{userName}}
{{caseId}}
{{caseSubject}}
{{caseStatus}}
{{caseUpdateMessage}}
{{caseUrl}}
{{supportEmail}}
{{currentYear}}
```
