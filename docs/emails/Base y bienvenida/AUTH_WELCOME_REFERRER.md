# Email de bienvenida — Referido

## ID

`AUTH_WELCOME_REFERRER`

## Estado

V1 — Redacción base lista para adaptar a HTML/Handlebars.

## From recomendado

`no_reply@yoteinvito.club`

## Subject

Tu perfil de referido ya está activo en Yo Te Invito

## Preview text

Ya podés vincularte con productoras, recibir propuestas y seguir tus métricas desde el portal.

## Cuerpo del email

Hola {{userName}},

¡Bienvenido a **Yo Te Invito**!

Tu perfil de referido ya está activo. Desde tu portal vas a poder vincularte con productoras, recibir propuestas comerciales, acceder a tus links y revisar las métricas de ventas atribuidas cuando haya acuerdos activos.

Recordá que Yo Te Invito funciona como un portal de comunicación y registro entre partes. Los acuerdos comerciales y los pagos entre productoras y referidos son externos a la plataforma.

Desde tu portal vas a poder:

- Ver propuestas recibidas.
- Revisar acuerdos activos.
- Acceder a tus links de referido.
- Consultar comisiones generadas según los acuerdos aceptados.
- Solicitar pagos externos a la productora cuando corresponda.

## CTA principal

**Ir al portal de referido**  
URL sugerida: `{{referrerDashboardUrl}}`

## Footer corto/legal

Este email fue enviado por Yo Te Invito.  
Si necesitás ayuda, escribinos a `{{supportEmail}}`.

Yo Te Invito registra acuerdos, atribuciones, comisiones generadas y solicitudes de pago, pero no administra ni garantiza pagos entre productoras y referidos.

© `{{currentYear}}` Yo Te Invito. Todos los derechos reservados.

## Variables dinámicas sugeridas

- `{{userName}}`
- `{{referrerName}}`
- `{{referrerDashboardUrl}}`
- `{{supportEmail}}`
- `{{operationsEmail}}`
- `{{currentYear}}`
- `{{legalTermsUrl}}`
- `{{referrerTermsUrl}}`

## Notas de implementación

- Mantener el tono profesional, cercano y claro.
- Usar layout común de emails Yo Te Invito: header de marca, contenido principal, CTA, bloque de soporte y footer legal.
- No incluir datos sensibles en el subject ni en el preview text.

