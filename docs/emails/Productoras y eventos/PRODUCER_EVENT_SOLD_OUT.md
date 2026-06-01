# TEMPLATE_ID
`PRODUCER_EVENT_SOLD_OUT`

## From
`operaciones@yoteinvito.club`

## Subject
Entradas agotadas para {{eventTitle}}

## Preview text
Una tanda, tipo de entrada o el evento completo alcanzó su disponibilidad máxima.

## Body
Hola {{producerName}},

Te informamos que las entradas para **{{eventTitle}}** alcanzaron su disponibilidad máxima en la configuración actual.

**Detalle**

- Evento: {{eventTitle}}
- Tipo de entrada: {{ticketTypeName}}
- Tanda: {{batchName}}
- Entradas vendidas: {{soldTickets}}
- Entradas disponibles: {{availableTickets}}

Si tu configuración contempla tandas sucesivas, revisá si la próxima tanda ya está activa o si requiere ajustes.

## CTA principal
Revisar tandas del evento — {{producerEventUrl}}

## Footer corto/legal
Este email es una alerta operativa sobre disponibilidad de entradas en Yo Te Invito.  
Para consultas, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{producerName}}
{{eventTitle}}
{{ticketTypeName}}
{{batchName}}
{{soldTickets}}
{{availableTickets}}
{{producerEventUrl}}
{{operationsEmail}}
{{currentYear}}
```
