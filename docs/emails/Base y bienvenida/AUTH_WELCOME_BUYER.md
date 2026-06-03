# Email de bienvenida — Usuario comprador

## ID

`AUTH_WELCOME_BUYER`

## Estado

V1 — Redacción base lista para adaptar a HTML/Handlebars.

## From recomendado

`no_reply@yoteinvito.club`

## Subject

Bienvenido a Yo Te Invito, {{userName}}

## Preview text

Tu cuenta ya está lista para descubrir eventos, experiencias y servicios en Yo Te Invito.

## Cuerpo del email

Hola {{userName}},

¡Bienvenido a **Yo Te Invito**!

Tu cuenta ya está activa. Desde ahora podés descubrir eventos, experiencias gastronómicas, excursiones, rentals y propuestas seleccionadas para disfrutar más de tu ciudad o tu viaje.

Con tu cuenta vas a poder:

- Comprar entradas y acceder a tus tickets digitales.
- Guardar eventos y experiencias para ver más tarde.
- Seguir productoras y locales que te interesen.
- Recibir alertas importantes sobre tus compras, tickets y actividades.

Te recomendamos completar tus preferencias para que podamos mostrarte propuestas más relevantes para vos.

## CTA principal

**Explorar Yo Te Invito**  
URL sugerida: `{{homeUrl}}`

## Footer corto/legal

Este email fue enviado por Yo Te Invito.  
Si necesitás ayuda, escribinos a `{{supportEmail}}`.

Yo Te Invito — Plataforma de ticketing, experiencias y servicios turísticos.  
© `{{currentYear}}` Yo Te Invito. Todos los derechos reservados.

## Variables dinámicas sugeridas

- `{{userName}}`
- `{{homeUrl}}`
- `{{preferencesUrl}}`
- `{{supportEmail}}`
- `{{currentYear}}`
- `{{legalTermsUrl}}`
- `{{privacyPolicyUrl}}`

## Notas de implementación

- Mantener el tono profesional, cercano y claro.
- Usar layout común de emails Yo Te Invito: header de marca, contenido principal, CTA, bloque de soporte y footer legal.
- No incluir datos sensibles en el subject ni en el preview text.

