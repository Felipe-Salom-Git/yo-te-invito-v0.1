# TEMPLATE_ID
`TICKET_TRANSFER_REJECTED`

## From
`no_reply@yoteinvito.club`

## Subject
{{recipientName}} rechazó la transferencia de ticket

## Preview text
La transferencia para {{eventTitle}} no fue aceptada.

## Body
Hola {{senderName}},

{{recipientName}} rechazó la transferencia del ticket para **{{eventTitle}}**.

El ticket vuelve a quedar bajo tu cuenta, sujeto al estado actual del evento y del ticket.

**Detalles**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Receptor: {{recipientName}}

## CTA principal
Ver mis tickets — {{ticketsUrl}}

## Footer corto/legal
Este email informa el rechazo de una transferencia de ticket en Yo Te Invito.  
Si tenés dudas, escribinos a {{supportEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{senderName}}
{{recipientName}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{ticketsUrl}}
{{supportEmail}}
{{currentYear}}
```
