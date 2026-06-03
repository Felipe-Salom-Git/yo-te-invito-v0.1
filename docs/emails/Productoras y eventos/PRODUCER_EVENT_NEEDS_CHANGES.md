# TEMPLATE_ID
`PRODUCER_EVENT_NEEDS_CHANGES`

## From
`operaciones@yoteinvito.club`

## Subject
Tu evento necesita algunos ajustes: {{eventTitle}}

## Preview text
Administración solicitó cambios antes de aprobar o publicar el evento.

## Body
Hola {{producerName}},

Estamos revisando tu evento **{{eventTitle}}** y necesitamos que realices algunos ajustes antes de avanzar.

{{#if requiredChanges}}
**Cambios solicitados**

{{requiredChanges}}
{{/if}}

{{#if reviewNotes}}
**Notas de revisión**

{{reviewNotes}}
{{/if}}

Te recomendamos actualizar la información desde tu portal y revisar especialmente textos, imágenes, ubicación, fechas, tandas y condiciones visibles para el comprador.

## CTA principal
Editar evento — {{producerEventUrl}}

## Footer corto/legal
Este email forma parte del proceso de revisión operativa de eventos en Yo Te Invito.  
Para consultas, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{producerName}}
{{eventTitle}}
{{requiredChanges}}
{{reviewNotes}}
{{producerEventUrl}}
{{operationsEmail}}
{{currentYear}}
```
