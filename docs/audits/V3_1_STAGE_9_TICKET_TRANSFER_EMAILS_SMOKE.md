# V3.1 Etapa 9 — Emails transferencia (Slice 9.4)

**Fecha:** 2026-06-10

## Templates verificados

| ID | Caller | Destinatario |
|----|--------|--------------|
| TICKET_TRANSFER_RECEIVED | create | Receptor (si `buyerUserId`) |
| TICKET_TRANSFER_ACCEPTED | accept | Emisor |
| TICKET_TRANSFER_REJECTED | reject | Emisor |
| TICKET_TRANSFER_CANCELLED | cancel | Receptor |
| TICKET_TRANSFER_EXPIRED | expireOffer (cron/lookup) | Emisor + receptor |

Registry: `email-template.registry.ts`. Fallo email: `void ...catch()` — no rompe estado.

## Smokes template

```bash
SMOKE_EMAIL_TEMPLATE_ID=TICKET_TRANSFER_RECEIVED pnpm --filter api run smoke:email-template
SMOKE_EMAIL_TEMPLATE_ID=TICKET_TRANSFER_ACCEPTED pnpm --filter api run smoke:email-template
SMOKE_EMAIL_TEMPLATE_ID=TICKET_TRANSFER_REJECTED pnpm --filter api run smoke:email-template
SMOKE_EMAIL_TEMPLATE_ID=TICKET_TRANSFER_CANCELLED pnpm --filter api run smoke:email-template
SMOKE_EMAIL_TEMPLATE_ID=TICKET_TRANSFER_EXPIRED pnpm --filter api run smoke:email-template
```

## Notificaciones in-app

Kinds en `NotificationKind`: `TRANSFER_OFFER_PENDING`, `TICKET_TRANSFER_*`. UI `/me/notifications` con labels en español.
