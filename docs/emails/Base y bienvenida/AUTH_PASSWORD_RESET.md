# Email de recuperación de contraseña

## ID

`AUTH_PASSWORD_RESET`

## Estado

V1 — Redacción base lista para adaptar a HTML/Handlebars.

## From recomendado

`no_reply@yoteinvito.club`

## Subject

Restablecé tu contraseña de Yo Te Invito

## Preview text

Usá este enlace para crear una nueva contraseña. Si no lo pediste, podés ignorar este mensaje.

## Cuerpo del email

Hola {{userName}},

Recibimos una solicitud para restablecer la contraseña de tu cuenta en **Yo Te Invito**.

Para crear una nueva contraseña, usá el botón de abajo. Por seguridad, este enlace tendrá una validez limitada.

Si no solicitaste este cambio, podés ignorar este email. Tu contraseña actual seguirá siendo válida mientras no completes el proceso de recuperación.

## CTA principal

**Restablecer contraseña**  
URL sugerida: `{{resetPasswordUrl}}`

## Footer corto/legal

Este email fue enviado por Yo Te Invito.  
Si no solicitaste este cambio o tenés dudas sobre la seguridad de tu cuenta, escribinos a `{{supportEmail}}`.

Yo Te Invito — Seguridad de cuenta.  
© `{{currentYear}}` Yo Te Invito. Todos los derechos reservados.

## Variables dinámicas sugeridas

- `{{userName}}`
- `{{resetPasswordUrl}}`
- `{{resetExpiresAt}}`
- `{{supportEmail}}`
- `{{currentYear}}`

## Notas de implementación

- Mantener el tono profesional, cercano y claro.
- Usar layout común de emails Yo Te Invito: header de marca, contenido principal, CTA, bloque de soporte y footer legal.
- No incluir datos sensibles en el subject ni en el preview text.
- No indicar en el subject si existe o no una cuenta asociada a un email específico.
