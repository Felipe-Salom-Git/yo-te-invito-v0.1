# TEMPLATE_ID
`TICKET_TRANSFER_SENT`

## From
`no_reply@yoteinvito.club`

## Subject
Transferencia enviada para {{eventTitle}}

## Preview text
Le enviamos la invitación a {{recipientName}} para aceptar el ticket.

## Body
Hola {{senderName}},

Tu transferencia de ticket para **{{eventTitle}}** fue enviada correctamente a {{recipientName}}.

La otra persona deberá aceptar la transferencia para que el ticket quede asociado a su cuenta.

**Detalles**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Receptor: {{recipientName}}
- Vence: {{transferExpiresAt}}

Mientras la transferencia esté pendiente, el ticket puede figurar con estado de transferencia en curso.

## CTA principal
Ver mis tickets — {{ticketsUrl}}

## Footer corto/legal
Este email confirma que solicitaste una transferencia de ticket desde Yo Te Invito.  
Si necesitás ayuda, escribinos a {{supportEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{senderName}}
{{recipientName}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{transferExpiresAt}}
{{ticketsUrl}}
{{supportEmail}}
{{currentYear}}
```
