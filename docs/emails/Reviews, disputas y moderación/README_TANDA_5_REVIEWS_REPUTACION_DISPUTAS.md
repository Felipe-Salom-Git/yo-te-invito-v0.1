# Yo Te Invito — Emails V1 — Tanda 5
## Reviews, reputación y disputas

Esta tanda cubre emails transaccionales y operativos vinculados a reseñas, respuestas oficiales, disputas y moderación.

## Emails incluidos

| ID | Archivo | Uso |
|---|---|---|
| `REVIEW_RECEIVED` | `REVIEW_RECEIVED.md` | Avisar a productora/gastro/hotel que recibió una reseña. |
| `REVIEW_OFFICIAL_REPLY` | `REVIEW_OFFICIAL_REPLY.md` | Avisar al autor que respondieron su reseña. |
| `REVIEW_PENDING_REMINDER` | `REVIEW_PENDING_REMINDER.md` | Invitar al comprador a dejar una reseña luego de asistir. |
| `REVIEW_DISPUTE_CREATED` | `REVIEW_DISPUTE_CREATED.md` | Confirmar que se creó una disputa de reseña. |
| `REVIEW_DISPUTE_IN_REVIEW` | `REVIEW_DISPUTE_IN_REVIEW.md` | Avisar que la disputa está siendo revisada. |
| `REVIEW_DISPUTE_ACCEPTED` | `REVIEW_DISPUTE_ACCEPTED.md` | Avisar que administración aceptó la disputa. |
| `REVIEW_DISPUTE_REJECTED` | `REVIEW_DISPUTE_REJECTED.md` | Avisar que administración rechazó la disputa. |
| `REVIEW_MODERATION_HIDDEN` | `REVIEW_MODERATION_HIDDEN.md` | Avisar que una reseña fue ocultada. |
| `REVIEW_MODERATION_RESTORED` | `REVIEW_MODERATION_RESTORED.md` | Avisar que una reseña fue restaurada. |

## Criterio de tono

- Neutral, claro y profesional.
- Evitar lenguaje acusatorio.
- En disputas, hablar de “revisión” y “criterios de moderación”, no de castigos.
- En respuestas oficiales, fomentar conversación respetuosa.
- En recordatorios, pedir opinión sin presionar.

## Remitentes sugeridos

| Tipo | From |
|---|---|
| Emails automáticos al usuario | `no_reply@yoteinvito.club` |
| Reviews/disputas para portales comerciales | `operaciones@yoteinvito.club` |
| Soporte visible | `soporte@yoteinvito.club` |

## Variables globales recomendadas

```txt
{{appName}}
{{brandName}}
{{userName}}
{{supportEmail}}
{{operationsEmail}}
{{baseUrl}}
{{dashboardUrl}}
{{currentYear}}
```

## Variables específicas frecuentes

```txt
{{reviewAuthorName}}
{{reviewRecipientName}}
{{entityName}}
{{entityType}}
{{eventTitle}}
{{reviewRating}}
{{reviewUrl}}
{{reviewTextPreview}}
{{replyTextPreview}}
{{disputeReason}}
{{disputeStatus}}
{{adminReason}}
{{adminNotes}}
{{reviewDashboardUrl}}
{{publicReviewUrl}}
{{emailPreferencesUrl}}
```
