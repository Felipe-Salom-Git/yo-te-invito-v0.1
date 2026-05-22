# Gastro — Payload QR de descuentos (v1)

**Estado:** emisión (Slice 4) + **validación en puerta** (Slice 5).

## Formato estable (v1)

```txt
yti:gastro-discount:v1:<discountId>:<token>
```

| Parte | Descripción |
|-------|-------------|
| Prefijo | `yti:gastro-discount:v1` — distingue de tickets (`yti:v1:`) y del formato legacy con `\|` |
| `discountId` | `GastroDiscount.id` (cuid) |
| `token` | Secreto opaco hex (16–128 chars). **No** incluye tenant, email ni JWT |

### Ejemplo

```txt
yti:gastro-discount:v1:clx9abc123456789:8f3a2b1c9d0e4f5a6b7c8d9e0f1a2b3c
```

## Qué token va en el QR

| Origen | Tabla / campo | Uso |
|--------|----------------|-----|
| Reclamo público (`POST …/claim`) | `GastroDiscountClaim.qrToken` | QR **único por email** — validación en puerta (Slice 5) |
| Aprobación admin | `GastroDiscount.qrToken` | QR **maestro** del ticket (email al local, referencia) |

Ambos usan el mismo formato v1; la API resuelve tenant y local por `discountId`.

## Generación (código)

- Shared: `packages/shared/src/gastro-discount-qr.ts`
  - `buildGastroDiscountQrPayload(discountId, token)`
  - `parseGastroDiscountQrPayload(raw)` — acepta v1 y legacy
  - `isValidGastroDiscountQrPayload(raw)`
- API: `PublicGastroDiscountsService`, `AdminGastroService.approve` / `sendQrEmail`
- Web: `apps/web/lib/gastro/discount-qr.ts`, `qr-image.ts`

## Formato legacy (solo lectura)

Histórico (pre Slice 4):

```txt
yti:gastro-discount|<tenantId>|<eventId>|<discountId>|<token>
```

`parseGastroDiscountQrPayload` sigue parseando legacy para QRs ya impresos. Los **nuevos** QR usan solo v1.

## Flujo de emisión (Slice 4)

1. Local crea ticket → `PENDING_REVIEW`
2. Admin aprueba → `ACTIVE` + `GastroDiscount.qrToken` (24 bytes hex)
3. Usuario reclama en `/descuentos/:id` → `GastroDiscountClaim` + payload v1 con `claim.qrToken`
4. Email / vista `/descuentos/reclamo/:claimId` muestran imagen QR con payload v1

## Slice 5 — validación en puerta (implementado)

### Endpoint

```http
POST /scanner/gastro-discounts/validate
Authorization: JWT o X-Dev-User-Id (DEV_AUTH)
Roles: SCANNER | ADMIN | GASTRO_OWNER
Body: { "qrPayload": "yti:gastro-discount:v1:…", "deviceId?": "…" }
```

### Flujo

1. `parseGastroDiscountQrPayload` (v1 o legacy)
2. Descuento en tenant del usuario; categoría `gastro`
3. `GastroDiscountClaim` por `{ discountId, qrToken }` → un uso por claim (`GastroDiscountValidation.claimId` único)
4. Sin claim: token maestro `GastroDiscount.qrToken` (referencia local, múltiples validaciones)
5. Solo `status === ACTIVE`; fechas `discountDate` / `validFrom` / `validTo`

### Respuesta (`ValidateGastroDiscountResponse`)

| status | Significado |
|--------|-------------|
| `VALID` | Registrado en `GastroDiscountValidation` |
| `ALREADY_USED` | Claim ya validado |
| `EXPIRED` | Fecha de vigencia pasada |
| `INACTIVE` | No ACTIVE (pendiente, cancelado, etc.) |
| `INVALID` | Payload, token o descuento inexistente |
| `LIMIT_REACHED` | Reservado (sin límite global en modelo actual) |

### Scanner PWA (`apps/scanner`)

- `classifyQrScanPayload`: entradas `yti:v1:` vs descuentos `yti:gastro-discount:…`
- Entradas: flujo `/scanner/scan` + offline (sin cambios)
- Descuentos: solo online → `POST /scanner/gastro-discounts/validate`

## Tests

```bash
pnpm --filter api run test:gastro-discount-qr
pnpm --filter api run test:gastro-discount-scan   # API en :3001 + DEV_AUTH
```

## Smokes sugeridos

```bash
pnpm --filter api run smoke:api
pnpm --filter api run debug:gastro-discounts
pnpm --filter api run smoke:reviews
pnpm --filter api run smoke:notifications
```

Follows / alerta descuento: [GASTRO_FOLLOWS_NOTIFICATIONS.md](./GASTRO_FOLLOWS_NOTIFICATIONS.md).
