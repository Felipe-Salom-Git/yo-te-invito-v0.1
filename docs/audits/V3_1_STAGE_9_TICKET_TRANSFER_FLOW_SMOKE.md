# V3.1 Etapa 9 — Smoke flujo emisor/receptor (Slice 9.2)

**Fecha:** 2026-06-10

## Cambios aplicados

- `occurrenceId` copiado al ticket destino en `accept`.
- Listado `/me/tickets` excluye tickets `TRANSFERRED` resueltos por `order.buyerEmail` (emisor no los ve como activos).
- Labels UI: ofertas rechazadas muestran «Rechazada» (`rejectedAt`).
- Mensajes de error transferencia en español (`lib/me/ticket-transfer-labels.ts`).

## Comandos

```bash
pnpm --filter @yo-te-invito/shared run build
cd apps/api && npx nest build
pnpm --filter web run build
pnpm --filter api run smoke:v31-ticket-transfer-flow
SMOKE_USER_EMAIL=... SMOKE_USER_PASSWORD=... pnpm --filter api run smoke:user-portal
SMOKE_ALLOW_DESTRUCTIVE=1 SMOKE_SECOND_USER_EMAIL=... pnpm --filter api run smoke:user-portal
```

## QA HTTP (`smoke:user-portal`)

| Caso | Esperado |
|------|----------|
| POST transfer-offers | `AVAILABLE`, ticket `TRANSFER_PENDING` |
| Scanner pending QR | `isValid: false` |
| POST cancel | ticket `VALID` |
| POST recipientEmail + lookup + reject | receptor puede rechazar |
| POST accept (destructivo) | destino `VALID`, origen `TRANSFERRED` |
| Legacy POST /tickets/:id/transfer | 410 |

## Pendiente Slice 9.3+

- QA manual UI móvil emisor/receptor.
- Segundo usuario smoke en CI con credenciales.
