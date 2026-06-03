# Yo Te Invito — Emails V1 — Tanda 2

## Alcance

Esta tanda cubre los emails transaccionales principales del flujo comprador:

- Orden creada / pago pendiente.
- Pago pendiente.
- Pago aprobado.
- Pago rechazado.
- Tickets emitidos.
- Factura emitida.
- Factura pendiente por revisión.

## Criterio de remitente

- Sender principal: `no_reply@yoteinvito.club`.
- Soporte visible: `soporte@yoteinvito.club`.
- Operación interna, si aplica: `operaciones@yoteinvito.club`.

## Reglas de tono

- Profesional, cercano y confiable.
- Evitar lenguaje alarmista.
- Confirmar solo lo que el sistema ya sabe.
- No prometer reembolsos, facturas o tickets si todavía están pendientes.
- Para errores de pago/factura, usar copy claro y tranquilizador.

## Variables globales sugeridas

```txt
{{appName}}
{{brandName}}
{{userName}}
{{supportEmail}}
{{baseUrl}}
{{loginUrl}}
{{currentYear}}
{{legalTermsUrl}}
{{privacyPolicyUrl}}
{{emailPreferencesUrl}}
```

## Variables específicas de checkout

```txt
{{eventTitle}}
{{eventDate}}
{{eventTime}}
{{venueName}}
{{venueAddress}}
{{orderId}}
{{orderUrl}}
{{paymentId}}
{{paymentStatus}}
{{paymentUrl}}
{{amount}}
{{currency}}
{{ticketCount}}
{{ticketsUrl}}
{{invoiceUrl}}
{{invoiceStatus}}
{{buyerName}}
{{expiresAt}}
```
