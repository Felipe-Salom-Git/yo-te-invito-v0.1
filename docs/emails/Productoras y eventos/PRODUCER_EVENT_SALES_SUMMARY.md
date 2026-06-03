# TEMPLATE_ID
`PRODUCER_EVENT_SALES_SUMMARY`

## From
`operaciones@yoteinvito.club`

## Subject
Resumen de ventas: {{eventTitle}}

## Preview text
Revisá el estado actualizado de entradas vendidas y métricas principales.

## Body
Hola {{producerName}},

Te compartimos un resumen actualizado de **{{eventTitle}}**.

**Resumen**

- Evento: {{eventTitle}}
- Entradas vendidas: {{soldTickets}}
- Entradas disponibles: {{availableTickets}}
- Total configurado: {{totalTickets}}
- Importe acumulado: {{currency}} {{salesAmount}}

Este resumen es informativo y puede variar según ajustes operativos, anulaciones, cortesías, reembolsos o conciliaciones pendientes.

## CTA principal
Ver métricas del evento — {{producerEventUrl}}

## Footer corto/legal
Este email es un resumen operativo generado por Yo Te Invito.  
La información final debe validarse siempre desde el portal y los reportes administrativos disponibles.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{producerName}}
{{eventTitle}}
{{soldTickets}}
{{availableTickets}}
{{totalTickets}}
{{currency}}
{{salesAmount}}
{{producerEventUrl}}
{{currentYear}}
```
