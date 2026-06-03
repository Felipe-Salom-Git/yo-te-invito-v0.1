# TEMPLATE_ID
`REVIEW_RECEIVED`

## From
`operaciones@yoteinvito.club`

## Subject
Recibiste una nueva reseña en {{entityName}}

## Preview text
Una persona dejó una valoración. Podés revisarla y responder desde tu portal.

## Body
Hola {{reviewRecipientName}},

Recibiste una nueva reseña en **{{entityName}}**.

**Resumen**

- Entidad: {{entityName}}
- Tipo: {{entityType}}
- Valoración: {{reviewRating}}/10
- Autor: {{reviewAuthorName}}

{{#if reviewTextPreview}}
**Comentario**

{{reviewTextPreview}}
{{/if}}

Podés revisar la reseña completa desde tu portal. Si corresponde, también podés responder de forma oficial para brindar contexto o agradecer la experiencia compartida.

## CTA principal
Ver reseña — {{reviewDashboardUrl}}

## Footer corto/legal
Este email informa una nueva reseña recibida en Yo Te Invito.  
Podés gestionar tus preferencias de notificación desde tu portal.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{reviewRecipientName}}
{{entityName}}
{{entityType}}
{{reviewRating}}
{{reviewAuthorName}}
{{reviewTextPreview}}
{{reviewDashboardUrl}}
{{currentYear}}
```
