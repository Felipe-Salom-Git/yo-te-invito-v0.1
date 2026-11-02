# QrPreparingOverlay

`apps/web/components/ux/QrPreparingOverlay.tsx` — G12.1-A (V3.3)

## Purpose

Visible, blocking feedback while a QR is generated and/or emailed. Before G12.1 those flows only
disabled the button, so on slow requests it looked like nothing was happening.

## Inputs

| Prop | Type | Notes |
|------|------|-------|
| `open` | `boolean` | Usually `mutation.isPending` (or `isQrPreparingVisible(...)`) |
| `mode` | `create \| create-and-send` | `QR_PREPARING_MODE`; send flows switch to «Preparando el envío…» after 1.5 s |
| `message` | `string?` | Overrides the default copy (Studio, producer tickets) |

## Behaviour

- Portal to `document.body`, `fixed inset-0 z-[90]`: covers the page **and** any open dialog, so
  there is no double submit. The trigger buttons stay `disabled` as before.
- Brand face (`/brand/logo.png` via `Logo`) spinning; `motion-reduce` → pulse.
- `role="status"`, `aria-live="polite"`, `aria-busy="true"`.
- Not dismissible: it disappears when the mutation leaves `pending`. On **success** the existing
  toast / result card is the feedback (no new toast); on **error** the existing inline / toast
  error shows. Claims that redirect on success use `keepOnSuccess` so the overlay stays until the
  route changes; an error resets the mutation, so it is never left blocked.

Logic: `apps/web/lib/ux/qrPreparing.ts` (`resolveQrPreparingMessage`, `isQrPreparingVisible`).

## Wired flows

| Flow | File | Mode |
|------|------|------|
| Public gastro discount claim | `components/gastro/GastroDiscountClaimForm.tsx` | create-and-send, keep on success |
| Public activity coupon claim | `components/activities/ActivityCouponClaimForm.tsx` | create, keep on success |
| Gastro courtesy request | `app/(portal)/gastro/descuentos/cortesia/page.tsx` | create-and-send |
| Admin funded courtesy | `app/(portal)/admin/gastronomicos/[profileId]/cortesia/page.tsx` | create-and-send |
| Admin discount: send QR email, redeliver, approve courtesy | `app/(portal)/admin/gastronomicos/[profileId]/descuentos/[discountId]/page.tsx` | create-and-send |
| Producer courtesy tickets | `components/producer/courtesies/ProducerCourtesiesPageClient.tsx` | custom message |
| Gastro QR Studio save | `components/gastro/qr-studio/GastroQrStudioClient.tsx` | custom message |

Assert: `pnpm --filter api run test:qr-preparing-overlay`.
