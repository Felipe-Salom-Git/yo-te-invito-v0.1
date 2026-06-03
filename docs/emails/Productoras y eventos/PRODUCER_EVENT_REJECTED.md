# TEMPLATE_ID
`PRODUCER_EVENT_REJECTED`

## From
`operaciones@yoteinvito.club`

## Subject
No pudimos aprobar tu evento: {{eventTitle}}

## Preview text
Revisá el motivo indicado por administración y corregí la información desde tu portal.

## Body
Hola {{producerName}},

Revisamos tu evento **{{eventTitle}}**, pero por el momento no pudo ser aprobado.

Esto no significa necesariamente que no pueda publicarse más adelante. Te recomendamos revisar el motivo informado y realizar los ajustes necesarios desde tu portal.

{{#if adminReason}}
**Motivo informado por administración**

{{adminReason}}
{{/if}}

{{#if reviewNotes}}
**Notas adicionales**

{{reviewNotes}}
{{/if}}

Una vez corregida la información, podés volver a enviar el evento a revisión si el flujo lo permite.

## CTA principal
Revisar evento — {{producerEventUrl}}

## Footer corto/legal
Este email informa una decisión administrativa sobre un evento enviado a Yo Te Invito.  
Si necesitás aclaraciones, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{producerName}}
{{eventTitle}}
{{adminReason}}
{{reviewNotes}}
{{producerEventUrl}}
{{operationsEmail}}
{{currentYear}}
```
