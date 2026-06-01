# TEMPLATE_ID
`ADMIN_DAILY_OPERATIONS_SUMMARY`

## From
`operaciones@yoteinvito.club`

## Subject
Resumen operativo diario — {{summaryDate}}

## Preview text
Actividad principal de Yo Te Invito: eventos, pagos, tickets, reviews y alertas.

## Body
Hola {{adminName}},

Este es el resumen operativo diario de Yo Te Invito para **{{summaryDate}}**.

**Eventos y operación**

- Eventos pendientes de revisión: {{pendingEventsCount}}
- Eventos aprobados: {{approvedEventsCount}}
- Eventos rechazados: {{rejectedEventsCount}}

**Compras y tickets**

- Órdenes creadas: {{ordersCreatedCount}}
- Pagos aprobados: {{paymentsApprovedCount}}
- Tickets emitidos: {{ticketsIssuedCount}}

**Reviews y soporte**

- Nuevas reseñas: {{reviewsCount}}
- Disputas abiertas: {{openDisputesCount}}
- Casos de soporte nuevos: {{supportCasesCount}}

**Alertas**

- Errores críticos: {{criticalErrorsCount}}
- Advertencias operativas: {{warningsCount}}

Este resumen es informativo. Para datos finales, revisá los reportes y registros administrativos correspondientes.

## CTA principal
Ir al panel admin — {{adminUrl}}

## Footer corto/legal
Este email es un resumen operativo interno de Yo Te Invito.  
No compartir fuera del equipo autorizado.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{adminName}}
{{summaryDate}}
{{pendingEventsCount}}
{{approvedEventsCount}}
{{rejectedEventsCount}}
{{ordersCreatedCount}}
{{paymentsApprovedCount}}
{{ticketsIssuedCount}}
{{reviewsCount}}
{{openDisputesCount}}
{{supportCasesCount}}
{{criticalErrorsCount}}
{{warningsCount}}
{{adminUrl}}
{{currentYear}}
```
