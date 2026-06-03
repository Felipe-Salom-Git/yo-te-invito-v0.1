# Email de bienvenida — Gastronómico

## ID

`AUTH_WELCOME_GASTRO`

## Estado

V1 — Redacción base lista para adaptar a HTML/Handlebars.

## From recomendado

`no_reply@yoteinvito.club`

## Subject

Tu espacio gastronómico ya está activo en Yo Te Invito

## Preview text

Ya podés preparar tu ficha, publicar contenido y gestionar descuentos para tus clientes.

## Cuerpo del email

Hola {{userName}},

¡Bienvenido a **Yo Te Invito**!

Tu acceso gastronómico ya está activo. Desde tu portal vas a poder administrar la presencia de tu local, publicar contenido, crear descuentos, revisar validaciones y responder reseñas.

Yo Te Invito está pensado para ayudarte a mostrar tu propuesta de forma clara, atractiva y confiable.

Desde tu portal vas a poder:

- Completar y actualizar la información de tu local.
- Publicar contenido gastronómico.
- Crear descuentos y promociones.
- Revisar validaciones de beneficios.
- Gestionar reseñas y respuestas oficiales.

## CTA principal

**Ir al portal gastronómico**  
URL sugerida: `{{gastroDashboardUrl}}`

## Footer corto/legal

Este email fue enviado por Yo Te Invito.  
Si necesitás ayuda, escribinos a `{{supportEmail}}`.

Yo Te Invito — Plataforma de ticketing, experiencias y servicios turísticos.  
© `{{currentYear}}` Yo Te Invito. Todos los derechos reservados.

## Variables dinámicas sugeridas

- `{{userName}}`
- `{{gastroName}}`
- `{{gastroDashboardUrl}}`
- `{{gastroProfileUrl}}`
- `{{supportEmail}}`
- `{{operationsEmail}}`
- `{{currentYear}}`
- `{{legalTermsUrl}}`
- `{{gastroTermsUrl}}`

## Notas de implementación

- Mantener el tono profesional, cercano y claro.
- Usar layout común de emails Yo Te Invito: header de marca, contenido principal, CTA, bloque de soporte y footer legal.
- No incluir datos sensibles en el subject ni en el preview text.

