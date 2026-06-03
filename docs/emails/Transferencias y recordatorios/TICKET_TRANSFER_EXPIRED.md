# TEMPLATE_ID
`TICKET_TRANSFER_EXPIRED`

## From
`no_reply@yoteinvito.club`

## Subject
La transferencia de ticket venció

## Preview text
La transferencia para {{eventTitle}} ya no está disponible.

## Body
Hola {{userName}},

La transferencia de ticket para **{{eventTitle}}** venció porque no fue aceptada dentro del plazo disponible.

Si todavía necesitás realizar esta operación, el titular del ticket puede generar una nueva transferencia desde su cuenta, siempre que el ticket y el evento lo permitan.

**Detalles**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Vencimiento: {{transferExpiresAt}}

## CTA principal
Ver mis tickets — {{ticketsUrl}}

## Footer corto/legal
Este email informa el vencimiento de una transferencia de ticket en Yo Te Invito.  
Para consultas, escribinos a {{supportEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{userName}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{transferExpiresAt}}
{{ticketsUrl}}
{{supportEmail}}
{{currentYear}}
```
