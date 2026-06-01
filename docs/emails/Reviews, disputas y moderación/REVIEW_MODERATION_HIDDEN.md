# TEMPLATE_ID
`REVIEW_MODERATION_HIDDEN`

## From
`operaciones@yoteinvito.club`

## Subject
Una reseña fue ocultada por moderación

## Preview text
La reseña vinculada a {{entityName}} ya no está visible públicamente.

## Body
Hola {{userName}},

Te informamos que una reseña vinculada a **{{entityName}}** fue ocultada por moderación.

Esta acción puede deberse a una revisión administrativa, una disputa aceptada o criterios internos de convivencia y calidad de la plataforma.

{{#if adminReason}}
**Motivo informado**

{{adminReason}}
{{/if}}

Podés consultar el estado desde tu cuenta o portal, según corresponda.

## CTA principal
Ver estado de la reseña — {{reviewUrl}}

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
