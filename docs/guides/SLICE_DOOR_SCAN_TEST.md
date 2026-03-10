# Door scan simulation test

Simulates door scans and validates ticket lifecycle (no physical scanner required).

## Prerequisites

- API running: `pnpm dev:api` (or `pnpm dev`)
- `DEV_AUTH_ENABLED=true` and `NODE_ENV=development` when starting the API
- Migrations applied: `pnpm db:migrate`

## Run

```bash
cd apps/api
pnpm run test:door-scan
```

Or from repo root:

```bash
pnpm --filter api run test:door-scan
```

## What it verifies

1. **Setup**: Creates tenant, event, ticketType, order, ticket (status=VALID)
2. **First scan** (`POST /scanner/scan`):
   - Response `result=OK`
   - Ticket.status → USED
   - Ticket.usedAt set
   - TicketScanLog created with result=OK
3. **Metrics**:
   - Event `scanCount` ≥ 1
   - Platform `totalScans` ≥ 1
4. **Second scan** (same qrPayload):
   - Response `result=ALREADY_USED`
   - Ticket.status still USED
   - TicketScanLog created with result=ALREADY_USED
   - `scanCount` unchanged
