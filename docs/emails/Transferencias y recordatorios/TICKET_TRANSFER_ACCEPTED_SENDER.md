# TEMPLATE_ID
`TICKET_TRANSFER_ACCEPTED_SENDER`

## From
`no_reply@yoteinvito.club`

## Subject
{{recipientName}} aceptó tu transferencia de ticket

## Preview text
El ticket para {{eventTitle}} ya fue transferido correctamente.

## Body
Hola {{senderName}},

{{recipientName}} aceptó la transferencia del ticket para **{{eventTitle}}**.

Desde este momento, el ticket queda asociado a la cuenta de {{recipientName}} y ya no estará disponible como ticket activo en tu cuenta.

**Detalles**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Receptor: {{recipientName}}

## CTA principal
Ver mis tickets — {{ticketsUrl}}

## Footer corto/legal
Este email confirma una transferencia aceptada en Yo Te Invito.  
Si no reconocés esta operación, contactanos en {{supportEmail}}.

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
