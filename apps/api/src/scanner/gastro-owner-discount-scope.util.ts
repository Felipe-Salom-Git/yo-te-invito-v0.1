/**
 * GASTRO_OWNER may only validate discounts of the authorized GastroProfile
 * (explicit profileId or default operational local) — not any membership of the same user.
 */

export function gastroOwnerDiscountMatchesAuthorizedProfile(
  authorizedProfileId: string | null | undefined,
  discountGastroProfileId: string | null | undefined,
): boolean {
  const authorized = authorizedProfileId?.trim() ?? '';
  const discountProfile = discountGastroProfileId?.trim() ?? '';
  if (!authorized || !discountProfile) return false;
  return authorized === discountProfile;
}
