# TEMPLATE_ID
`REVIEW_MODERATION_RESTORED`

## From
`operaciones@yoteinvito.club`

## Subject
Una reseña fue restaurada

## Preview text
La reseña vinculada a {{entityName}} volvió a estar disponible según su estado actual.

## Body
Hola {{userName}},

Te informamos que una reseña vinculada a **{{entityName}}** fue restaurada.

Esto significa que la reseña vuelve a estar disponible según su estado actual dentro de la plataforma.

{{#if adminReason}}
**Motivo informado**

{{adminReason}}
{{/if}}

Podés revisar la reseña desde Yo Te Invito.

## CTA principal
Ver reseña — {{reviewUrl}}

## Footer corto/legal
Este email informa una acción de moderación realizada en Yo Te Invito.  
Para consultas, escribinos a {{supportEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{userName}}
{{entityName}}
{{adminReason}}
{{reviewUrl}}
{{supportEmail}}
{{currentYear}}
```
