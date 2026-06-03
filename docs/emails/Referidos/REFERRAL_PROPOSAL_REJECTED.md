# TEMPLATE_ID
`REFERRAL_PROPOSAL_REJECTED`

## From
`operaciones@yoteinvito.club`

## Subject
{{referrerName}} rechazó tu propuesta

## Preview text
La propuesta para {{eventTitle}} no fue aceptada.

## Body
Hola {{producerName}},

{{referrerName}} rechazó la propuesta comercial vinculada a **{{eventTitle}}**.

Esto significa que no se generará un acuerdo activo a partir de esa propuesta.

{{#if rejectionReason}}
**Motivo indicado**

{{rejectionReason}}
{{/if}}

Podés revisar el estado desde tu portal y, si corresponde, enviar una nueva propuesta con otras condiciones.

## CTA principal
Ver propuestas — {{producerDashboardUrl}}

## Footer corto/legal
Este email informa el estado de una propuesta comercial entre productora y referido dentro de Yo Te Invito.  
La plataforma no administra fondos ni garantiza acuerdos económicos entre las partes.

Para consultas operativas, escribinos a {{operationsEmail}}.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{producerName}}
{{referrerName}}
{{eventTitle}}
{{rejectionReason}}
{{producerDashboardUrl}}
{{operationsEmail}}
{{currentYear}}
```
