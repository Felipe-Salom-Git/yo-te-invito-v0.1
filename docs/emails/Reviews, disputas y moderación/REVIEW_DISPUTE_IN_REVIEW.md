# TEMPLATE_ID
`REVIEW_DISPUTE_IN_REVIEW`

## From
`operaciones@yoteinvito.club`

## Subject
Tu disputa de reseña está en revisión

## Preview text
Administración está revisando el caso vinculado a {{entityName}}.

## Body
Hola {{reviewRecipientName}},

La disputa de reseña vinculada a **{{entityName}}** fue marcada como **en revisión**.

Esto significa que administración está evaluando la información disponible antes de tomar una decisión.

**Resumen**

- Entidad: {{entityName}}
- Tipo: {{entityType}}
- Estado: {{disputeStatus}}

{{#if adminNotes}}
**Notas de revisión**

{{adminNotes}}
{{/if}}

Te avisaremos cuando haya una actualización sobre el resultado de la disputa.

## CTA principal
Ver estado de la disputa — {{reviewDashboardUrl}}

## Footer corto/legal
Este email informa una actualización sobre una disputa de reseña en Yo Te Invito.  
Para consultas, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{reviewRecipientName}}
{{entityName}}
{{entityType}}
{{disputeStatus}}
{{adminNotes}}
{{reviewDashboardUrl}}
{{operationsEmail}}
{{currentYear}}
```
