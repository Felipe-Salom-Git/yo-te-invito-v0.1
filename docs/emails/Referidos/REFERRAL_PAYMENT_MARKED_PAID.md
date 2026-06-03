# TEMPLATE_ID
`REFERRAL_PAYMENT_MARKED_PAID`

## From
`operaciones@yoteinvito.club`

## Subject
{{producerName}} marcó tu solicitud como pagada

## Preview text
La productora registró el pago de una solicitud vinculada a tus comisiones.

## Body
Hola {{referrerName}},

{{producerName}} marcó como pagada una solicitud vinculada a tus comisiones de referido.

**Resumen**

- Productora: {{producerName}}
- Monto registrado: {{currency}} {{paymentRequestAmount}}
- Evento/acuerdo: {{eventTitle}}
- Fecha de registro: {{markedPaidAt}}

Este estado indica que la productora registró el pago como realizado dentro de Yo Te Invito. La plataforma no verifica transferencias externas ni administra fondos entre las partes.

## CTA principal
Ver solicitud — {{paymentRequestUrl}}

## Footer corto/legal
Yo Te Invito registra acuerdos, atribuciones, comisiones generadas y solicitudes de pago entre productoras y referidos.  
La plataforma no administra fondos, no procesa pagos entre las partes y no garantiza el cumplimiento económico de esos acuerdos.

Para consultas operativas, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{referrerName}}
{{producerName}}
{{currency}}
{{paymentRequestAmount}}
{{eventTitle}}
{{markedPaidAt}}
{{paymentRequestUrl}}
{{operationsEmail}}
{{currentYear}}
```
