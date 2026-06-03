# Yo Te Invito — Emails V1 — Tanda 6
## Referidos

Esta tanda cubre emails transaccionales y operativos vinculados al flujo de referidos:

- Asociación entre productora y referido.
- Propuestas comerciales.
- Aceptación o rechazo de propuestas.
- Acuerdos activos.
- Comisiones generadas.
- Solicitudes de pago.
- Pagos marcados como realizados.

## Emails incluidos

| ID | Archivo | Uso |
|---|---|---|
| `REFERRER_ASSOCIATED_TO_PRODUCER` | `REFERRER_ASSOCIATED_TO_PRODUCER.md` | Avisar al referido que quedó asociado a una productora. |
| `PRODUCER_REFERRER_ASSOCIATED` | `PRODUCER_REFERRER_ASSOCIATED.md` | Avisar a la productora que un referido quedó asociado. |
| `REFERRAL_PROPOSAL_RECEIVED` | `REFERRAL_PROPOSAL_RECEIVED.md` | Avisar al referido que recibió una propuesta comercial. |
| `REFERRAL_PROPOSAL_ACCEPTED` | `REFERRAL_PROPOSAL_ACCEPTED.md` | Avisar a la productora que el referido aceptó la propuesta. |
| `REFERRAL_PROPOSAL_REJECTED` | `REFERRAL_PROPOSAL_REJECTED.md` | Avisar a la productora que el referido rechazó la propuesta. |
| `REFERRAL_AGREEMENT_ACTIVE` | `REFERRAL_AGREEMENT_ACTIVE.md` | Confirmar a ambas partes que el acuerdo quedó activo. |
| `REFERRAL_COMMISSION_CONFIRMED` | `REFERRAL_COMMISSION_CONFIRMED.md` | Avisar al referido que se registró una comisión generada. |
| `REFERRAL_PAYMENT_REQUEST_CREATED` | `REFERRAL_PAYMENT_REQUEST_CREATED.md` | Avisar a la productora que el referido solicitó el pago. |
| `REFERRAL_PAYMENT_MARKED_PAID` | `REFERRAL_PAYMENT_MARKED_PAID.md` | Avisar al referido que la productora marcó el pago como realizado. |

## Criterio de tono

- Profesional, claro y transparente.
- Evitar lenguaje de “saldo disponible”, “retiro” o “payout” cuando la plataforma no custodia fondos.
- Reforzar que los pagos son acuerdos externos entre productora y referido.
- Hablar de “comisión registrada”, “solicitud de pago” y “pago marcado como realizado”.
- No prometer cobro garantizado.

## Remitente sugerido

`operaciones@yoteinvito.club`

## Disclaimer estándar referidos

```txt
Yo Te Invito registra acuerdos, atribuciones, comisiones generadas y solicitudes de pago entre productoras y referidos. La plataforma no administra fondos, no procesa pagos entre las partes y no garantiza el cumplimiento económico de esos acuerdos.
```

## Variables globales recomendadas

```txt
{{appName}}
{{brandName}}
{{supportEmail}}
{{operationsEmail}}
{{baseUrl}}
{{dashboardUrl}}
{{currentYear}}
```

## Variables específicas frecuentes

```txt
{{producerName}}
{{referrerName}}
{{eventTitle}}
{{proposalUrl}}
{{agreementUrl}}
{{referrerDashboardUrl}}
{{producerDashboardUrl}}
{{commissionType}}
{{commissionValue}}
{{commissionAmount}}
{{currency}}
{{ticketCount}}
{{attributedSalesCount}}
{{paymentRequestUrl}}
{{paymentRequestAmount}}
{{markedPaidAt}}
{{proposalMessage}}
{{rejectionReason}}
```
