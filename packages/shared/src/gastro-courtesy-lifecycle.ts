/**
 * G8 — Pure helpers for the Gastro courtesy domain.
 *
 * A courtesy is NOT a separate entity: it is a `GastroDiscount` with
 * `visibility = COURTESY_ONLY` + a `GastroCourtesyCampaign` + per-recipient
 * `GastroDiscountClaim(type = COURTESY)`. These helpers centralize the rules that
 * make that reuse safe, and are consumed by API services, web UI and tests.
 */

export const GASTRO_COURTESY_ONLY_VISIBILITY = 'COURTESY_ONLY' as const;

export function isCourtesyOnlyVisibility(visibility: string | null | undefined): boolean {
  return visibility === GASTRO_COURTESY_ONLY_VISIBILITY;
}

/**
 * A courtesy start/end window is valid when `validFrom <= validTo`
 * (same-day windows are allowed; dates are expected to be already normalized).
 */
export function isCourtesyValidityRangeValid(validFrom: Date, validTo: Date): boolean {
  const from = validFrom.getTime();
  const to = validTo.getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return false;
  return from <= to;
}

// ---------------------------------------------------------------------------
// G8.2 — Lifecycle isolation
// ---------------------------------------------------------------------------

/**
 * Master (discount-level) QR.
 *
 * A courtesy is delivered ONLY through individual claims (one QR per recipient).
 * A discount-level `qrToken` is reusable by anyone holding it and creates validations
 * with `claimId = null`, so a courtesy must NEVER own one — not at creation, not on
 * (re)activation, not on approval.
 */
export function canIssueMasterQr(visibility: string | null | undefined): boolean {
  return !isCourtesyOnlyVisibility(visibility);
}

/** True only when a discount-level QR must be generated now (non-courtesy without one). */
export function shouldGenerateMasterQr(input: {
  visibility: string | null | undefined;
  existingQrToken: string | null | undefined;
}): boolean {
  if (!canIssueMasterQr(input.visibility)) return false;
  return !input.existingQrToken;
}

/**
 * Whether the scanner may redeem a discount through the master-QR path
 * (`claimId = null`). Never for courtesies, even if a legacy row somehow has a `qrToken`.
 */
export function isMasterQrRedeemable(visibility: string | null | undefined): boolean {
  return canIssueMasterQr(visibility);
}

/** Courtesies are immutable after send: generic edit endpoints must reject them. */
export function isGenericDiscountEditBlocked(visibility: string | null | undefined): boolean {
  return isCourtesyOnlyVisibility(visibility);
}

export const GASTRO_COURTESY_EDIT_BLOCKED_MESSAGE =
  'Las cortesías no se pueden editar después del envío. Cancelá la campaña y enviá una nueva.';

/**
 * Cancelling a courtesy campaign is terminal: claims are cancelled, so reactivating the
 * discount would leave unusable claims (and must never mint a master QR).
 */
export function courtesyStatusChangeBlocker(input: {
  visibility: string | null | undefined;
  currentStatus: string;
  targetStatus: string;
}): 'CANCELLED_IS_TERMINAL' | null {
  if (
    isCourtesyOnlyVisibility(input.visibility) &&
    input.currentStatus === 'CANCELLED' &&
    input.targetStatus === 'ACTIVE'
  ) {
    return 'CANCELLED_IS_TERMINAL';
  }
  return null;
}

export const GASTRO_COURTESY_CANCELLED_TERMINAL_MESSAGE =
  'Una cortesía cancelada no se puede reactivar. Enviá una nueva cortesía.';

/**
 * Claim statuses turned into CANCELLED when the campaign is cancelled.
 * USED claims are historical redemptions and stay USED; EXPIRED/CANCELLED stay as they are.
 */
export const COURTESY_CLAIM_STATUSES_CANCELLED_ON_CAMPAIGN_CANCEL = ['ACTIVE'] as const;

/** A one-shot courtesy expiring is expected: do not send the "Descuento vencido" notice. */
export function shouldNotifyDiscountExpired(visibility: string | null | undefined): boolean {
  return !isCourtesyOnlyVisibility(visibility);
}
