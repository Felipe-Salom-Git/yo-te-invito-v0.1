# Email de bienvenida — Productora

## ID

`AUTH_WELCOME_PRODUCER`

## Estado

V1 — Redacción base lista para adaptar a HTML/Handlebars.

## From recomendado

`no_reply@yoteinvito.club`

## Subject

Tu perfil de productora ya está activo en Yo Te Invito

## Preview text

Ya podés comenzar a preparar tu perfil, cargar eventos y gestionar tu presencia en la plataforma.

## Cuerpo del email

Hola {{userName}},

¡Bienvenido a **Yo Te Invito**!

Tu acceso como productora ya está activo. Desde tu portal vas a poder gestionar tu perfil, crear eventos, administrar entradas, configurar tandas, revisar métricas y trabajar con referidos cuando corresponda.

Para empezar, te recomendamos completar la información de tu productora. Un perfil claro y cuidado ayuda a generar más confianza en las personas que descubren tus eventos.

Desde tu portal vas a poder:

- Completar la identidad pública de tu productora.
- Crear y editar eventos.
- Configurar tipos de entrada y tandas.
- Revisar métricas, reseñas y estado de publicaciones.
- Gestionar acuerdos con referidos.

## CTA principal

**Ir al portal de productora**  
URL sugerida: `{{producerDashboardUrl}}`

## Footer corto/legal

Este email fue enviado por Yo Te Invito.  
Si necesitás ayuda, escribinos a `{{supportEmail}}`.

Yo Te Invito — Plataforma de ticketing, experiencias y servicios turísticos.  
© `{{currentYear}}` Yo Te Invito. Todos los derechos reservados.

## Variables dinámicas sugeridas

- `{{userName}}`
- `{{producerName}}`
- `{{producerDashboardUrl}}`
- `{{producerProfileUrl}}`
- `{{supportEmail}}`
- `{{operationsEmail}}`
- `{{currentYear}}`
- `{{legalTermsUrl}}`
- `{{producerTermsUrl}}`

## Notas de implementación

- Mantener el tono profesional, cercano y claro.
- Usar layout común de emails Yo Te Invito: header de marca, contenido principal, CTA, bloque de soporte y footer legal.
- No incluir datos sensibles en el subject ni en el preview text.

