# TEMPLATE_ID
`REFERRAL_PAYMENT_REQUEST_CREATED`

## From
`operaciones@yoteinvito.club`

## Subject
{{referrerName}} solicitó registrar un pago

## Preview text
Hay una solicitud de pago vinculada a comisiones de referido.

## Body
Hola {{producerName}},

{{referrerName}} generó una solicitud de pago vinculada a comisiones registradas en Yo Te Invito.

**Resumen**

- Referido: {{referrerName}}
- Monto solicitado: {{currency}} {{paymentRequestAmount}}
- Evento/acuerdo: {{eventTitle}}

Esta solicitud no procesa dinero automáticamente. Sirve como registro operativo para que ambas partes puedan coordinar el pago por fuera de la plataforma.

Cuando el pago haya sido realizado, podés marcarlo como pagado desde tu portal.

## CTA principal
Revisar solicitud — {{paymentRequestUrl}}

## Footer corto/legal
Yo Te Invito registra acuerdos, atribuciones, comisiones generadas y solicitudes de pago entre productoras y referidos.  
La plataforma no administra fondos, no procesa pagos entre las partes y no garantiza el cumplimiento económico de esos acuerdos.

Para consultas operativas, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{producerName}}
{{referrerName}}
{{currency}}
{{paymentRequestAmount}}
{{eventTitle}}
{{paymentRequestUrl}}
{{operationsEmail}}
{{currentYear}}
```
