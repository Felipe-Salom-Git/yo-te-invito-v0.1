# TEMPLATE_ID
`PRODUCER_EVENT_LOW_STOCK`

## From
`operaciones@yoteinvito.club`

## Subject
Quedan pocas entradas para {{eventTitle}}

## Preview text
Una tanda o tipo de entrada está cerca de agotarse.

## Body
Hola {{producerName}},

Te avisamos que quedan pocas entradas disponibles para **{{eventTitle}}**.

**Detalle**

- Evento: {{eventTitle}}
- Tipo de entrada: {{ticketTypeName}}
- Tanda: {{batchName}}
- Entradas vendidas: {{soldTickets}}
- Entradas disponibles: {{availableTickets}}
- Total configurado: {{totalTickets}}

Podés revisar el estado de tus tandas desde el portal y tomar decisiones operativas si corresponde.

## CTA principal
Ver entradas del evento — {{producerEventUrl}}

## Footer corto/legal
Este email es una alerta operativa sobre disponibilidad de entradas en Yo Te Invito.  
Podés revisar tus preferencias de notificación desde tu portal.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{producerName}}
{{eventTitle}}
{{ticketTypeName}}
{{batchName}}
{{soldTickets}}
{{availableTickets}}
{{totalTickets}}
{{producerEventUrl}}
{{currentYear}}
```
