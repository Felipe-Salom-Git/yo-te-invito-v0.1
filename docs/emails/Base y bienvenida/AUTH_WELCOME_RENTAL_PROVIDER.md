# Email de bienvenida / alta operativa — Proveedor rental

## ID

`AUTH_WELCOME_RENTAL_PROVIDER`

## Estado

V1 — Redacción base lista para adaptar a HTML/Handlebars.

## From recomendado

`operaciones@yoteinvito.club`

## Subject

Tu proveedor de rentals ya fue registrado en Yo Te Invito

## Preview text

Ya podemos comenzar a preparar locales, productos y consultas de disponibilidad para tu operación.

## Cuerpo del email

Hola {{userName}},

¡Bienvenido a **Yo Te Invito**!

Tu proveedor de rentals ya fue registrado para avanzar con la carga operativa de locales y productos de alquiler. Esta vertical está pensada para equipos, movilidad y aventura: autos, bicicletas, kayaks, ropa de invierno, equipos de nieve y otros servicios turísticos.

Desde la operación de Yo Te Invito se podrán administrar:

- Locales o puntos de alquiler.
- Productos asociados a cada local.
- Imágenes principales y galerías.
- Datos de contacto y WhatsApp.
- Consultas de disponibilidad desde la ficha pública.

Por ahora, el alta de rentals se gestiona de forma operativa/manual y no desde un registro público automático.

## CTA principal

**Contactar a operaciones**  
URL sugerida: `{{operationsContactUrl}}`

## Footer corto/legal

Este email fue enviado por Yo Te Invito.  
Si necesitás ayuda, escribinos a `{{supportEmail}}`.

Yo Te Invito — Plataforma de ticketing, experiencias y servicios turísticos.  
© `{{currentYear}}` Yo Te Invito. Todos los derechos reservados.

## Variables dinámicas sugeridas

- `{{userName}}`
- `{{rentalProviderName}}`
- `{{rentalLocationName}}`
- `{{operationsContactUrl}}`
- `{{supportEmail}}`
- `{{operationsEmail}}`
- `{{currentYear}}`
- `{{legalTermsUrl}}`
- `{{rentalTermsUrl}}`

## Notas de implementación

- Mantener el tono profesional, cercano y claro.
- Usar layout común de emails Yo Te Invito: header de marca, contenido principal, CTA, bloque de soporte y footer legal.
- No incluir datos sensibles en el subject ni en el preview text.
- Este template aplica como alta operativa/manual, no como signup público, porque Rental no tiene wizard V2 de registro.
