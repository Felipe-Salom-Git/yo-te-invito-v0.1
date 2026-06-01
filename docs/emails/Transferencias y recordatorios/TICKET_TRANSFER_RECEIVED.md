# TEMPLATE_ID
`TICKET_TRANSFER_RECEIVED`

## From
`no_reply@yoteinvito.club`

## Subject
{{senderName}} te transfirió un ticket para {{eventTitle}}

## Preview text
Tenés una transferencia pendiente. Revisala y aceptala antes de que venza.

## Body
Hola {{recipientName}},

{{senderName}} te transfirió un ticket para **{{eventTitle}}**.

Para que el ticket quede asociado a tu cuenta, necesitás revisar la transferencia y aceptarla desde Yo Te Invito.

**Detalles del evento**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Lugar: {{venueName}}
- Dirección: {{venueAddress}}

La transferencia estará disponible hasta **{{transferExpiresAt}}**. Si no la aceptás antes de ese momento, puede vencer automáticamente.

## CTA principal
Aceptar transferencia — {{transferUrl}}

## Footer corto/legal
Este email fue enviado porque recibiste una transferencia de ticket en Yo Te Invito.  
Si no esperabas esta transferencia, podés ignorar este mensaje o escribirnos a {{supportEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{recipientName}}
{{senderName}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{venueName}}
{{venueAddress}}
{{transferUrl}}
{{transferExpiresAt}}
{{supportEmail}}
{{currentYear}}
```
