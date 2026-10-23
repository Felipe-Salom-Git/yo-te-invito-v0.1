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

// ---------------------------------------------------------------------------
// G8.3 / G8.4 — Approval + retained claims + delivery
// ---------------------------------------------------------------------------

/**
 * Parent-discount statuses in which a courtesy has been REQUESTED but not yet approved.
 * A courtesy created by a GASTRO OWNER is born in `PENDING_REVIEW` (reusing the existing
 * `GastroDiscount` lifecycle; no new enum value).
 */
export const COURTESY_PRE_APPROVAL_DISCOUNT_STATUSES = [
  'PENDING_REVIEW',
  'COMMISSION_NEGOTIATION',
] as const;

export function isCourtesyPendingApproval(status: string | null | undefined): boolean {
  return (
    status != null &&
    (COURTESY_PRE_APPROVAL_DISCOUNT_STATUSES as readonly string[]).includes(status)
  );
}

/**
 * Initial `GastroDiscount.status` of a new courtesy.
 *  - ADMIN: no review step (but the commercial agreement gate still runs before creating).
 *  - GASTRO owner: `PENDING_REVIEW` until an ADMIN approves it.
 */
export function initialCourtesyDiscountStatus(
  actorRole: string,
): 'ACTIVE' | 'PENDING_REVIEW' {
  return actorRole === 'ADMIN' ? 'ACTIVE' : 'PENDING_REVIEW';
}

/**
 * RETAINED CLAIM (Option A).
 *
 * A courtesy claim is "retained" while its parent campaign has not been approved: the
 * recipient set is frozen (claim rows exist) but they are NOT usable. No schema change:
 * the invariant is `claim usable ⇔ claim.status = ACTIVE ∧ parent redeemable`, which the
 * scanner already enforces (`isParentDiscountRedeemable`). `/me` and the public claim view
 * use the helper below so a retained claim is never exposed to the recipient.
 */
export function isCourtesyClaimRetained(input: {
  claimType: string | null | undefined;
  claimStatus: string | null | undefined;
  parentStatus: string | null | undefined;
}): boolean {
  return (
    input.claimType === 'COURTESY' &&
    input.claimStatus === 'ACTIVE' &&
    isCourtesyPendingApproval(input.parentStatus)
  );
}

/**
 * Whether a claim may be shown to its recipient (`/me/descuentos`, public claim view).
 *
 * Courtesy claims are hidden while pending approval and after a rejection (the recipient
 * never received them). Everything else (including legacy ACTIVE courtesies and public
 * claims of any parent status) keeps its current visibility.
 */
export function isClaimVisibleToRecipient(input: {
  claimType: string | null | undefined;
  parentStatus: string | null | undefined;
}): boolean {
  if (input.claimType !== 'COURTESY') return true;
  if (isCourtesyPendingApproval(input.parentStatus)) return false;
  if (input.parentStatus === 'REJECTED') return false;
  return true;
}

/** Claim statuses cancelled when a pending courtesy is rejected (same set as cancel). */
export const COURTESY_CLAIM_STATUSES_CANCELLED_ON_REJECT = ['ACTIVE'] as const;

/**
 * A claim still needs its delivery email: usable, never successfully sent.
 * (Failures keep `emailSentAt = null`, so a retry only targets those.)
 */
export function isCourtesyClaimPendingDelivery(input: {
  claimType: string | null | undefined;
  claimStatus: string | null | undefined;
  emailSentAt: Date | string | null | undefined;
}): boolean {
  return (
    input.claimType === 'COURTESY' && input.claimStatus === 'ACTIVE' && input.emailSentAt == null
  );
}

// ---------------------------------------------------------------------------
// G8.5 / G8.7 — Benefit label
// ---------------------------------------------------------------------------

export const GASTRO_COURTESY_DEFAULT_BENEFIT_LABEL = 'Cortesía';

/** "0", "0%", "$0", "$ 0" → a courtesy must never present these as its benefit. */
const ZERO_BENEFIT_PATTERN = /^\s*\$?\s*0+(?:[.,]0+)?\s*%?\s*$/;

/**
 * Human benefit text of a courtesy. A courtesy `GastroDiscount` stores `value = 0`, so
 * `formatDiscountVisualBenefit(type, value)` would render "0%": the real benefit is the
 * campaign's own `discountLabel` (e.g. "Postre de cortesía"). Falls back to the campaign
 * title, then to the discount title, then to a neutral "Cortesía" — never to "0%".
 */
export function resolveCourtesyBenefitLabel(
  campaign: { discountLabel?: string | null; title?: string | null } | null | undefined,
  fallbackTitle?: string | null,
): string {
  const candidates = [campaign?.discountLabel, campaign?.title, fallbackTitle];
  for (const raw of candidates) {
    const text = raw?.trim();
    if (text && !ZERO_BENEFIT_PATTERN.test(text)) return text;
  }
  return GASTRO_COURTESY_DEFAULT_BENEFIT_LABEL;
}

export const GASTRO_COURTESY_EXPIRED_AT_APPROVAL_MESSAGE =
  'La cortesía ya venció y no puede aprobarse. Rechazala para cerrar la solicitud.';

export const GASTRO_COURTESY_AGREEMENT_REQUIRED_MESSAGE =
  'El local no tiene acuerdo comercial vigente. Creá o activá la tarifa del partner antes de aprobar o enviar la cortesía.';
