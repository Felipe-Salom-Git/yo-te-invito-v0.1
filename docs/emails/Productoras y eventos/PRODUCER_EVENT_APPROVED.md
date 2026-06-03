# TEMPLATE_ID
`PRODUCER_EVENT_APPROVED`

## From
`operaciones@yoteinvito.club`

## Subject
Tu evento fue aprobado: {{eventTitle}}

## Preview text
Administración aprobó tu evento. Ya podés revisar su estado desde tu portal.

## Body
Hola {{producerName}},

¡Buenas noticias! Tu evento **{{eventTitle}}** fue aprobado por administración.

Esto significa que la revisión principal fue completada correctamente. Podés ingresar a tu portal para revisar la información final, estado de publicación, entradas y configuración del evento.

**Datos del evento**

- Evento: {{eventTitle}}
- Fecha: {{eventDate}}
- Hora: {{eventTime}}
- Lugar: {{venueName}}

Te recomendamos verificar que los textos, imágenes, ubicación y tandas estén correctos antes de compartirlo con tu público.

## CTA principal
Ver evento aprobado — {{producerEventUrl}}

## Footer corto/legal
Este email informa una actualización importante sobre el estado de tu evento en Yo Te Invito.  
Si detectás algún dato incorrecto, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{producerName}}
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{venueName}}
{{producerEventUrl}}
{{operationsEmail}}
{{currentYear}}
```
