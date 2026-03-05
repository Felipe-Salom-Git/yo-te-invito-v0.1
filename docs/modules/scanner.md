# Technical SPEC: Slice 06 — Scanner Validation Core

## 1) Domain Overview

The Scanner Validation Core enables door staff to validate tickets at event entrances by scanning QR codes. Each scan is logged for audit and analytics. The system prevents double-scan (re-use of the same ticket) via atomic status updates.

**Key constraints:**
- Route: `POST /scanner/validate` (no `/api/v1` prefix)
- Multi-tenant: `tenantId` required as query parameter
- All scan attempts are logged to `TicketScan` regardless of outcome
- Atomic update prevents race conditions on concurrent double-scans

---

## 2) Prisma Model: TicketScan

Stores every scan attempt for auditing and analytics.

| Field    | Type    | Description                              |
| -------- | ------- | ---------------------------------------- |
| id       | String  | cuid primary key                         |
| tenantId | String  | FK to Tenant                             |
| eventId  | String  | FK to Event                              |
| ticketId | String? | FK to Ticket (null when ticket not found)|
| qrPayload| String  | Scanned QR payload                       |
| deviceId | String? | Optional scanner device identifier       |
| isValid  | Boolean | Whether the scan was successful          |
| reason   | String  | EVENT_NOT_FOUND, TICKET_NOT_FOUND, REVOKED, ALREADY_USED, SUCCESS |
| createdAt| DateTime| Scan timestamp                           |

**Relations:**
- Tenant.ticketScans
- Event.ticketScans
- Ticket.ticketScans

**Indexes:** tenantId, eventId, ticketId

---

## 3) Shared Schemas (packages/shared)

### Query: validateTicketQuerySchema
- `tenantId`: string (required)

### Body: validateTicketBodySchema
- `eventId`: string (required)
- `qrPayload`: string (required)
- `deviceId`: string (optional)

### Response: validateTicketResponseSchema
- `isValid`: boolean
- `ticketId`: string (optional)
- `ticketTypeName`: string (optional)
- `message`: string

---

## 4) API Endpoint

**POST** `/scanner/validate?tenantId=...`

**Request Body:**
```json
{
  "eventId": "evt_xxx",
  "qrPayload": "hex_or_cuid_string",
  "deviceId": "device-123"
}
```

**Success (200):**
```json
{
  "isValid": true,
  "ticketId": "tkt_xxx",
  "ticketTypeName": "General",
  "message": "VALID"
}
```

---

## 5) Business Rules

1. **Event validation:** Event must exist for tenant and have `deletedAt: null`. If not → TicketScan (EVENT_NOT_FOUND) + 404.
2. **Ticket lookup:** Ticket must match `qrPayload` and `eventId`. If not → TicketScan (TICKET_NOT_FOUND) + 404.
3. **REVOKED:** If ticket status is REVOKED → TicketScan (REVOKED) + 400.
4. **USED:** If ticket status is USED → TicketScan (ALREADY_USED) + 409.
5. **VALID:** Atomic `updateMany` with `where: { id, status: 'VALID' }` and `data: { status: 'USED' }`. If `count === 0` (race lost) → TicketScan (ALREADY_USED) + 409. If `count === 1` → TicketScan (SUCCESS) + 200.

---

## 6) Error Responses

| Scenario        | HTTP | Code            | TicketScan reason  |
| --------------- | ---- | --------------- | ------------------ |
| Event not found | 404  | NOT_FOUND       | EVENT_NOT_FOUND    |
| Ticket not found| 404  | NOT_FOUND       | TICKET_NOT_FOUND   |
| Revoked ticket  | 400  | VALIDATION_FAILED | REVOKED          |
| Already used    | 409  | CONFLICT        | ALREADY_USED       |

---

## 7) Double-Scan Concurrency

Concurrent requests for the same VALID ticket are serialized by the database. One `updateMany` succeeds (`count === 1`), the other sees `count === 0` (status already USED). Both attempts are logged; one returns 200, the other 409.
