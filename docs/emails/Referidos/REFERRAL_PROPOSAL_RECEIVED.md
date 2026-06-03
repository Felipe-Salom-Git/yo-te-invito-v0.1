# TEMPLATE_ID
`REFERRAL_PROPOSAL_RECEIVED`

## From
`operaciones@yoteinvito.club`

## Subject
Recibiste una propuesta de {{producerName}}

## Preview text
Revisá las condiciones de la propuesta antes de aceptarla.

## Body
Hola {{referrerName}},

{{producerName}} te envió una propuesta comercial para participar como referido en **{{eventTitle}}**.

**Resumen de la propuesta**

- Productora: {{producerName}}
- Evento: {{eventTitle}}
- Tipo de comisión: {{commissionType}}
- Valor de comisión: {{commissionValue}}

{{#if proposalMessage}}
**Mensaje de la productora**

{{proposalMessage}}
{{/if}}

Antes de aceptar, revisá bien las condiciones. Al aceptar la propuesta, se podrá generar un acuerdo operativo dentro de Yo Te Invito para registrar atribuciones y comisiones generadas según corresponda.

## CTA principal
Revisar propuesta — {{proposalUrl}}

## Footer corto/legal
Yo Te Invito registra acuerdos, atribuciones, comisiones generadas y solicitudes de pago entre productoras y referidos.  
La plataforma no administra fondos, no procesa pagos entre las partes y no garantiza el cumplimiento económico de esos acuerdos.

Para consultas operativas, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{referrerName}}
{{producerName}}
{{eventTitle}}
{{commissionType}}
{{commissionValue}}
{{proposalMessage}}
{{proposalUrl}}
{{operationsEmail}}
{{currentYear}}
```
