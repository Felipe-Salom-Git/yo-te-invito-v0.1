# TEMPLATE_ID
`REVIEW_OFFICIAL_REPLY`

## From
`no_reply@yoteinvito.club`

## Subject
Respondieron tu reseña sobre {{entityName}}

## Preview text
Hay una respuesta oficial disponible para la reseña que dejaste.

## Body
Hola {{reviewAuthorName}},

{{entityName}} respondió oficialmente la reseña que dejaste en Yo Te Invito.

{{#if replyTextPreview}}
**Respuesta**

{{replyTextPreview}}
{{/if}}

Podés ver la conversación completa desde la plataforma.

## CTA principal
Ver respuesta — {{publicReviewUrl}}

## Footer corto/legal
Este email fue enviado porque interactuaron con una reseña que publicaste en Yo Te Invito.  
Podés revisar tus preferencias de notificación desde tu cuenta.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{reviewAuthorName}}
{{entityName}}
{{replyTextPreview}}
{{publicReviewUrl}}
{{emailPreferencesUrl}}
{{currentYear}}
```
