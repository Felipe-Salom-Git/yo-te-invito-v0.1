# TEMPLATE_ID
`REVIEW_DISPUTE_ACCEPTED`

## From
`operaciones@yoteinvito.club`

## Subject
La disputa de reseña fue aceptada

## Preview text
Administración revisó el caso y tomó una decisión sobre la reseña.

## Body
Hola {{reviewRecipientName}},

Administración revisó la disputa vinculada a **{{entityName}}** y decidió aceptarla.

Esto puede implicar una acción de moderación sobre la reseña, según corresponda al caso y a las reglas de la plataforma.

{{#if adminReason}}
**Motivo de la decisión**

{{adminReason}}
{{/if}}

Podés consultar el estado actualizado desde tu portal.

## CTA principal
Ver reseña/disputa — {{reviewDashboardUrl}}

## Footer corto/legal
Este email informa una decisión administrativa sobre una disputa de reseña en Yo Te Invito.  
Las acciones de moderación pueden variar según el caso evaluado.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{reviewRecipientName}}
{{entityName}}
{{adminReason}}
{{reviewDashboardUrl}}
{{currentYear}}
```
