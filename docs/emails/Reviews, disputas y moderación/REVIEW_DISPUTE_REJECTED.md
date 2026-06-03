# TEMPLATE_ID
`REVIEW_DISPUTE_REJECTED`

## From
`operaciones@yoteinvito.club`

## Subject
La disputa de reseña fue rechazada

## Preview text
Administración revisó el caso y la reseña se mantiene según el estado indicado.

## Body
Hola {{reviewRecipientName}},

Administración revisó la disputa vinculada a **{{entityName}}** y decidió rechazarla.

Esto significa que, según la revisión realizada, no se aplicará la acción solicitada sobre la reseña en este momento.

{{#if adminReason}}
**Motivo de la decisión**

{{adminReason}}
{{/if}}

Podés revisar el estado actualizado desde tu portal.

## CTA principal
Ver reseña/disputa — {{reviewDashboardUrl}}

## Footer corto/legal
Este email informa una decisión administrativa sobre una disputa de reseña en Yo Te Invito.  
Si necesitás realizar otra consulta, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{reviewRecipientName}}
{{entityName}}
{{adminReason}}
{{reviewDashboardUrl}}
{{operationsEmail}}
{{currentYear}}
```
