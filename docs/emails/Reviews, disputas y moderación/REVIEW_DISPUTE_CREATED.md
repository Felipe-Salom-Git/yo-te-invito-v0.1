# TEMPLATE_ID
`REVIEW_DISPUTE_CREATED`

## From
`operaciones@yoteinvito.club`

## Subject
Se creó una disputa de reseña

## Preview text
La solicitud fue registrada y quedará disponible para revisión.

## Body
Hola {{reviewRecipientName}},

Registramos una disputa sobre una reseña vinculada a **{{entityName}}**.

Nuestro equipo o el área correspondiente podrá revisar el caso según los criterios de moderación de la plataforma.

**Resumen**

- Entidad: {{entityName}}
- Tipo: {{entityType}}
- Valoración: {{reviewRating}}/10
- Estado de disputa: {{disputeStatus}}

{{#if disputeReason}}
**Motivo indicado**

{{disputeReason}}
{{/if}}

Mientras la disputa esté en revisión, te recomendamos evitar respuestas impulsivas y mantener toda la comunicación dentro de los canales disponibles.

## CTA principal
Ver disputa — {{reviewDashboardUrl}}

## Footer corto/legal
Este email confirma el registro de una disputa de reseña en Yo Te Invito.  
La revisión no garantiza un resultado específico y dependerá de los criterios de moderación aplicables.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{reviewRecipientName}}
{{entityName}}
{{entityType}}
{{reviewRating}}
{{disputeStatus}}
{{disputeReason}}
{{reviewDashboardUrl}}
{{currentYear}}
```
