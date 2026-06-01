# TEMPLATE_ID
`ADMIN_NEW_EVENT_PENDING`

## From
`operaciones@yoteinvito.club`

## Subject
Nuevo evento pendiente de revisión: {{eventTitle}}

## Preview text
Una productora envió un evento que requiere revisión administrativa.

## Body
Hola {{adminName}},

Hay un nuevo evento pendiente de revisión en Yo Te Invito.

**Resumen**

- Evento: {{eventTitle}}
- Productora: {{producerName}}
- Email productora: {{producerEmail}}
- Fecha del evento: {{eventDate}}
- Ciudad: {{eventCity}}
- ID evento: {{eventId}}

Revisá la información cargada, imágenes, ubicación, fechas, tandas y condiciones antes de aprobar o solicitar cambios.

## CTA principal
Revisar evento — {{eventAdminUrl}}

## Footer corto/legal
Este email es una alerta operativa interna de Yo Te Invito.  
Si no corresponde a tu área, reenviá el caso a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{adminName}}
{{eventTitle}}
{{producerName}}
{{producerEmail}}
{{eventDate}}
{{eventCity}}
{{eventId}}
{{eventAdminUrl}}
{{operationsEmail}}
{{currentYear}}
```
