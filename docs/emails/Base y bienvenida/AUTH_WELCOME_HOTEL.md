# Email de bienvenida — Hotel

## ID

`AUTH_WELCOME_HOTEL`

## Estado

V1 — Redacción base lista para adaptar a HTML/Handlebars.

## From recomendado

`no_reply@yoteinvito.club`

## Subject

Tu perfil de hotel ya está activo en Yo Te Invito

## Preview text

Ya podés completar tu ficha informativa y preparar tu presencia pública en la plataforma.

## Cuerpo del email

Hola {{userName}},

¡Bienvenido a **Yo Te Invito**!

Tu acceso como hotel ya está activo. En esta etapa, la vertical hoteles funciona como una ficha pública informativa, pensada para presentar tu alojamiento con datos claros, contacto y reputación.

Desde tu portal vas a poder:

- Completar la información de tu hotel.
- Cargar imágenes y datos de contacto.
- Mantener actualizada tu ficha pública.
- Revisar valoraciones cuando estén disponibles.

Por ahora, Yo Te Invito no gestiona reservas hoteleras ni pagos de alojamiento desde la plataforma.

## CTA principal

**Ir al portal de hotel**  
URL sugerida: `{{hotelDashboardUrl}}`

## Footer corto/legal

Este email fue enviado por Yo Te Invito.  
Si necesitás ayuda, escribinos a `{{supportEmail}}`.

Yo Te Invito — Plataforma de ticketing, experiencias y servicios turísticos.  
© `{{currentYear}}` Yo Te Invito. Todos los derechos reservados.

## Variables dinámicas sugeridas

- `{{userName}}`
- `{{hotelName}}`
- `{{hotelDashboardUrl}}`
- `{{hotelProfileUrl}}`
- `{{supportEmail}}`
- `{{operationsEmail}}`
- `{{currentYear}}`
- `{{legalTermsUrl}}`
- `{{hotelTermsUrl}}`

## Notas de implementación

- Mantener el tono profesional, cercano y claro.
- Usar layout común de emails Yo Te Invito: header de marca, contenido principal, CTA, bloque de soporte y footer legal.
- No incluir datos sensibles en el subject ni en el preview text.
- Mantener explícita la aclaración de que hoteles no gestiona reservas/pagos si la vertical sigue en modo informativo.
