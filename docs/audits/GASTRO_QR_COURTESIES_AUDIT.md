# Gastro QR / Cortesías V2 — cierre

Fecha cierre código: 2026-06-23  
Doc: auditoría + reglas implementadas (Slices 1–5)  
**V2.1** (2026-06-23): recurrente semanal, contador admin, fix emails cortesía.

---

## Gastro Discounts V2.1 (2026-06-23)

| Feature | Estado |
|---------|--------|
| `validityMode` DATE_RANGE / WEEKLY_RECURRING + `validWeekday` | ✅ Migración `20260625120000_gastro_discount_weekly_recurrence` |
| Scanner `NOT_VALID_TODAY` (día AR) | ✅ `isGastroDiscountValidToday` |
| Form gastro: fecha vs día semanal | ✅ `GastroDiscountForm` |
| Admin KPI cupones escaneados | ✅ `gastroDiscountClaimsUsedCount` + métricas por descuento |
| Emails cortesía con diagnóstico | ✅ `failedCount`, `failures[]`, `emailConfigured`; link fallback en template |

Commits: `ee888af`, `a86be41`, `dd0e022`, `6043975`, `a69190e`.

---

## Estado

**Completado en código** — pendiente **QA manual en staging/prod** y deploy VPS si aún no aplicó migración `20260615120000_gastro_courtesy_discount_claims`.

---

## Reglas implementadas

| Regla | Estado |
|-------|--------|
| Vencimiento inclusivo (fin de día AR) | ✅ `gastro-discount-expiry.ts` + scanner/me/public |
| Uso único por claim | ✅ Transacción + `GastroDiscountValidation.claimId` único |
| Límite 1 cupón/día por `userId` o `email` | ✅ `LIMIT_REACHED` en scanner |
| Email cortesía/solicitud con QR | ✅ Templates + `claimUrl` |
| CTA email → claim público | ✅ `/descuentos/reclamo/:claimId?token=...` |
| CTA secundario si hay cuenta | ✅ «Ver en mi cuenta» → `/me/descuentos` |
| UI QR tipo ticket | ✅ `GastroDiscountQrCard` |
| Visible en cuenta | ✅ `/me/descuentos` |

**Observación:** token maestro `GastroDiscount.qrToken` (sin claim) sigue siendo referencia local multi-uso (v1).

---

## Vencimiento inclusivo

- Zona: `America/Argentina/Buenos_Aires` (`GASTRO_DISCOUNT_TIMEZONE`).
- Un descuento que vence el **24/06/2026** es válido todo ese día local.
- Util: `packages/shared/src/gastro-discount-expiry.ts`.
- Persistencia: `validTo` / `expiresAt` normalizados a fin de día local al guardar.

---

## Uso único y límite diario

- Redención: `ScannerGastroDiscountService` — transacción con `updateMany` (`ACTIVE`, `usedAt: null`).
- Límite diario antes de marcar `USED` por `userId` o email normalizado.

### Mensajes scanner

| status | Título |
|--------|--------|
| `VALID` | Cupón válido |
| `ALREADY_USED` | Cupón ya utilizado |
| `EXPIRED` | Cupón vencido |
| `LIMIT_REACHED` | Límite diario alcanzado |
| `INVALID` | QR inválido |

---

## Emails

| Template | Subject (cortesía) |
|----------|-------------------|
| `GASTRO_DISCOUNT_QR_COURTESY` | Tenés una cortesía gastronómica en Yo Te Invito |
| `GASTRO_DISCOUNT_QR_REQUESTED` | Tu descuento para {gastroName} está listo |

- CTA principal: **Ver mi QR** → claim público.
- CTA secundario (solo `recipientUserId`): **Ver en mi cuenta**.
- Servicio: `GastroDiscountClaimEmailService.buildClaimUrl()`.

---

## Frontend

| Ruta | Componente |
|------|------------|
| `/me/descuentos` | `GastroDiscountQrCard` |
| `/descuentos/reclamo/[claimId]` | `GastroDiscountQrCard` |
| Helpers | `lib/gastro/discount-status-ui.ts` |

Estilo alineado con `DefaultBuyerTicket`: logo, gradiente, QR 280px (`TicketQrImage`), estado, «Uso único».

---

## Archivos principales

**Shared:** `gastro-discount-expiry.ts`  
**API:** `scanner-gastro-discount.service.ts`, `gastro-discount-claim-email.service.ts`, `public-gastro-discounts.service.ts`, `me-gastro-discounts.service.ts`, `gastro-courtesy-discounts.service.ts`, `gastro-portal-discounts.service.ts`  
**Email:** `gastro-discount-qr.template.ts`, `base-email-layout.ts` (CTA secundario)  
**Web:** `GastroDiscountQrCard.tsx`, `me/descuentos/page.tsx`, `descuentos/reclamo/[claimId]/page.tsx`

---

## Checks automáticos

```bash
pnpm --filter shared build
pnpm --filter api build
pnpm --filter web build
pnpm --filter scanner build
pnpm --filter api run test:gastro-discount-expiry
pnpm --filter api run test:gastro-discount-qr
pnpm --filter api run test:gastro-discount-scan   # requiere API + DEV_AUTH
SMOKE_EMAIL_TEMPLATE_ID=GASTRO_DISCOUNT_QR_COURTESY pnpm --filter api run smoke:email-template
```

---

## QA manual (pendiente operación)

| # | Caso | Esperado |
|---|------|----------|
| QA 1 | Descuento vence hoy | Scanner válido todo el día |
| QA 2 | `/me/descuentos` mismo día | Estado «Disponible», no vencido antes de tiempo |
| QA 3 | Escanear QR dos veces | Segundo → «Cupón ya utilizado» |
| QA 4 | Dos cupones misma cuenta mismo día | Segundo → límite diario |
| QA 5 | Cortesía a usuario registrado | Email + link claim + visible en `/me/descuentos` |
| QA 6 | Cortesía a email sin cuenta | Email con CTA claim; escaneo OK |
| QA 7 | Mobile | Card premium legible; scanner lee QR |

Flujos adicionales: solicitud web pública, cortesía manual, cortesía seguidores, spam/correo no deseado.

---

## Pendientes

- QA manual staging/prod (tabla arriba).
- Deploy VPS + `prisma migrate deploy` si no aplicado.
- Token maestro multi-uso: decisión producto futura (opcional deshabilitar en scanner).

---

## Referencias

- Modelo v1: `docs/gastro/GASTRO_DISCOUNT_QR.md`
- Cierre cortesías v1: `docs/audits/GASTRO_DISCOUNTS_QR_COURTESY_CLOSING.md`
