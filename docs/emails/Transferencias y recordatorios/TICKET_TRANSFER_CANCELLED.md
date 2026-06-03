# TEMPLATE_ID
`TICKET_TRANSFER_CANCELLED`

## From
`no_reply@yoteinvito.club`

## Subject
La transferencia de ticket fue cancelada

## Preview text
La transferencia para {{eventTitle}} ya no está disponible.

## Body
Hola {{recipientName}},

La transferencia de ticket para **{{eventTitle}}** fue cancelada por {{senderName}}.

Esto significa que ya no podés aceptar esa transferencia desde el enlace anterior.

**Detalles**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Emisor: {{senderName}}

## CTA principal
Ir a Yo Te Invito — {{baseUrl}}

## Footer corto/legal
Este email informa la cancelación de una transferencia de ticket en Yo Te Invito.  
Si creés que se trata de un error, escribinos a {{supportEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{recipientName}}
{{senderName}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{baseUrl}}
{{supportEmail}}
{{currentYear}}
```
