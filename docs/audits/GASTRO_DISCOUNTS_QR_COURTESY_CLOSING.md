# Gastro discounts QR courtesy — closing audit

Fecha: 2026-06-15  
Rama: `feat/v1-s03-api-foundation`

## Modelo implementado

### Enums

- `GastroDiscountVisibility`: `PUBLIC` | `COURTESY_ONLY`
- `GastroDiscountClaimType`: `PUBLIC_REQUEST` | `COURTESY`
- `GastroDiscountClaimSource`: `WEB` | `MANUAL_EMAIL` | `FOLLOWERS`
- `GastroDiscountClaimStatus`: `ACTIVE` | `USED` | `EXPIRED` | `CANCELLED`

### Entidades

- **`GastroCourtesyCampaign`**: campaña privada por envío de cortesías (título, beneficio, vigencia, mensaje, `discountId` único).
- **`GastroDiscountClaim`** (extendido): `type`, `source`, `status`, `expiresAt`, `usedAt`, `recipientName`, `courtesyCampaignId`; índice único `(courtesyCampaignId, email)`.
- **`GastroDiscount.visibility`**: filtra cortesías de listados públicos.

### Auditoría

- `GASTRO_DISCOUNT_COURTESY_CREATED`
- `GASTRO_DISCOUNT_COURTESY_SENT`
- `GASTRO_DISCOUNT_REQUESTED`
- `GASTRO_DISCOUNT_REDEEMED`

Migración: `20260615120000_gastro_courtesy_discount_claims`

---

## Flujos

### Público (solicitud web)

1. Usuario en ficha/descuento → **Solicitar descuento**
2. `POST /public/gastro-discounts/:id/claim` (JWT opcional)
3. Claim `PUBLIC_REQUEST` + QR único (`qrToken` hex 48 chars)
4. Email `GASTRO_DISCOUNT_QR_REQUESTED`
5. Visible en `/me/descuentos` (por `userId` o email)

Anti-duplicado: si ya existe claim **activo** para `(discountId, email)`, reenvía email con QR existente.

### Cortesía manual

1. Gastro en `/gastro/descuentos/cortesia`
2. Emails manuales + preview destinatarios
3. `POST /gastro/discounts/courtesy/send`
4. Crea `GastroDiscount` `COURTESY_ONLY` + campaña + claims
5. Email `GASTRO_DISCOUNT_QR_COURTESY` por destinatario

### Cortesía seguidores

- Checkbox “Enviar a seguidores” → deduplica con emails manuales
- Preview: `GET /gastro/discounts/courtesy/recipients-preview`

### Usuario (`/me/descuentos`)

- `GET /me/gastro-discounts`
- Cards con QR, código, estado, tipo (solicitado/cortesía), vencimiento

### Validación scanner

- Reutiliza `POST /scanner/gastro-discounts/validate`
- Respeta `claim.status`, `expiresAt`, `usedAt`
- Marca claim `USED` + `usedAt` al validar
- Audita `GASTRO_DISCOUNT_REDEEMED`

---

## Templates email

| ID | Subject |
|---|---|
| `GASTRO_DISCOUNT_QR_REQUESTED` | Tu descuento para {{gastroName}} está listo |
| `GASTRO_DISCOUNT_QR_COURTESY` | {{gastroName}} te envió una cortesía |

Incluyen: QR embebido, código alternativo, vencimiento, CTA Mi cuenta, layout dark/green.

Smoke (requiere `SMOKE_EMAIL_TO` + mail configurado):

```bash
SMOKE_EMAIL_TEMPLATE_ID=GASTRO_DISCOUNT_QR_REQUESTED pnpm --filter api run smoke:email-template
SMOKE_EMAIL_TEMPLATE_ID=GASTRO_DISCOUNT_QR_COURTESY pnpm --filter api run smoke:email-template
```

---

## QA ejecutado (automático)

| Check | Resultado |
|---|---|
| `pnpm --filter shared run build` | OK |
| `pnpm --filter api run build` | OK |
| `pnpm --filter web run build` | OK |
| `pnpm --filter scanner run build` | OK |
| Smoke email (render registry) | Templates registrados; envío requiere `SMOKE_EMAIL_TO` |

## QA manual pendiente

| Flujo | Estado |
|---|---|
| Solicitud pública logueado | Pendiente manual |
| Solicitud pública invitado | Pendiente manual |
| Email QR descuento web | Pendiente manual (SMTP/Resend) |
| Cortesía email manual | Pendiente manual |
| Cortesía seguidores | Pendiente manual |
| Mi cuenta descuentos | Pendiente manual |
| Validación QR scanner | Pendiente manual |
| Anti-duplicado | Pendiente manual |
| Cortesía NO en ficha pública | Implementado (`visibility: COURTESY_ONLY`) |

---

## Pendientes

- Ejecutar migración en VPS: `pnpm --filter api exec prisma migrate deploy`
- Smoke email con destinatario real en staging
- Panel admin envío cortesías desde `/admin/gastronomicos/:id` (opcional; gastro portal cubre el flujo)
- Rate limit explícito en claim público (anti-abuso básico vía anti-duplicado activo)

---

## Recomendación

**Sí — pushear y redeployar** API + Web tras aplicar migración. Pasar a QA manual en staging con un local gastro de prueba, un usuario seguidor y un email externo sin cuenta.
