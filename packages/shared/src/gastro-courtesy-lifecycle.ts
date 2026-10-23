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
