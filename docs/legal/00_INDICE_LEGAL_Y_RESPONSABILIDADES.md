# Yo Te Invito — Índice legal y responsabilidades por perfil

> Documento base operativo para revisión interna y posterior revisión legal profesional. No reemplaza asesoramiento jurídico.

## Datos a completar antes de publicar

- Razón social / titular de la plataforma: `[COMPLETAR]`
- CUIT: `[COMPLETAR]`
- Domicilio legal/comercial: `[COMPLETAR]`
- Email de soporte: `[COMPLETAR]`
- Teléfono / WhatsApp de soporte: `[COMPLETAR]`
- Dominio oficial: `[COMPLETAR]`
- Jurisdicción: San Carlos de Bariloche, Río Negro, República Argentina, salvo que el cliente confirme otra.
- Fecha de entrada en vigencia: `[COMPLETAR]`
- Versión inicial sugerida: `v1.0.0`

## Documentos incluidos

1. Términos y Condiciones Generales.
2. Política de Privacidad.
3. Política de Compra, Cancelación y Reembolso.
4. Condiciones para Productores/Productoras.
5. Condiciones para Gastronómicos.
6. Condiciones para Rentals / Proveedores de Equipos.
7. Condiciones para Hoteles.
8. Condiciones para Referidos.
9. Condiciones de Transferencia de Tickets.
10. Procedimiento interno de soporte.

## Principio rector de responsabilidad

Yo Te Invito opera como plataforma tecnológica, de difusión, comunicación, gestión operativa y ticketing digital cuando corresponda. Salvo que se indique expresamente lo contrario, la plataforma no organiza eventos, no presta directamente servicios turísticos, gastronómicos, hoteleros o de alquiler, no garantiza acuerdos comerciales externos entre partes y no interviene en pagos manuales externos.

## Ubicaciones recomendadas dentro de la app

- Footer público: links a términos, privacidad, compra/reembolso, soporte y botón/formulario de arrepentimiento si aplica.
- Registro: aceptación obligatoria de términos generales y, según perfil, condiciones específicas.
- Checkout: aceptación/confirmación de política de compra, cancelación y reembolso.
- Portales: link persistente a condiciones específicas del rol.
- Referidos: disclaimer visible en propuesta, aceptación de acuerdo y solicitud de pago.
- Transferencia de tickets: aviso antes de crear, aceptar o rechazar transferencia.

## Versionado recomendado

Cada documento legal debería tener:

- `documentKey`: por ejemplo `terms_general`, `privacy_policy`, `refund_policy`, `producer_terms`.
- `version`: por ejemplo `1.0.0`.
- `publishedAt`.
- `effectiveFrom`.
- `isActive`.
- `contentHash` opcional.

Cada usuario debería registrar:

- `userId`.
- `documentKey`.
- `version` aceptada.
- `acceptedAt`.
- `ipAddress` opcional.
- `userAgent` opcional.
- `context`: `register`, `checkout`, `portal_onboarding`, `referral_agreement`, etc.
