# TEMPLATE_ID
`EVENT_REMINDER_24H`

## From
`no_reply@yoteinvito.club`

## Subject
Mañana es {{eventTitle}}

## Preview text
Tené tu ticket listo y revisá los datos del evento antes de asistir.

## Body
Hola {{userName}},

Te recordamos que **{{eventTitle}}** es mañana.

Prepará tu ticket con QR y revisá los datos del evento antes de salir.

**Detalles del evento**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Lugar: {{venueName}}
- Dirección: {{venueAddress}}

Te recomendamos llegar con anticipación y tener tu QR disponible desde el celular o impreso.

## CTA principal
Ver mi ticket — {{ticketsUrl}}

## Footer corto/legal
Recibís este email porque tenés un ticket para este evento en Yo Te Invito.  
Podés revisar tus preferencias de notificación desde tu cuenta.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{userName}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{venueName}}
{{venueAddress}}
{{ticketsUrl}}
{{emailPreferencesUrl}}
{{currentYear}}
```
