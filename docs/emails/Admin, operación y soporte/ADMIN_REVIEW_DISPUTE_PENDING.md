# TEMPLATE_ID
`ADMIN_REVIEW_DISPUTE_PENDING`

## From
`operaciones@yoteinvito.club`

## Subject
Nueva disputa de reseña pendiente

## Preview text
Hay una disputa de reseña que requiere revisión administrativa.

## Body
Hola {{adminName}},

Se registró una nueva disputa de reseña pendiente de revisión.

**Resumen**

- Entidad: {{entityName}}
- Tipo: {{entityType}}
- Valoración: {{reviewRating}}/10
- Solicitante: {{requesterName}}
- Fecha/hora: {{occurredAt}}

{{#if disputeReason}}
**Motivo indicado**

{{disputeReason}}
{{/if}}

Te recomendamos revisar la reseña, contexto, historial y criterios de moderación antes de tomar una decisión.

## CTA principal
Revisar disputa — {{adminUrl}}

## Footer corto/legal
Este email es una alerta operativa interna de Yo Te Invito.  
Las decisiones de moderación deben registrarse desde el panel correspondiente.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{adminName}}
{{entityName}}
{{entityType}}
{{reviewRating}}
{{requesterName}}
{{occurredAt}}
{{disputeReason}}
{{adminUrl}}
{{currentYear}}
```
