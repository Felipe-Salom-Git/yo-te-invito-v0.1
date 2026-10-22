/**
 * ScannerAccount (GASTRO) may only validate discounts of its parent GastroProfile.
 * Same GASTRO owner across locals is not sufficient.
 */

export function scannerGastroDiscountMatchesParentProfile(
  scannerParentProfileId: string | null | undefined,
  discountGastroProfileId: string | null | undefined,
): boolean {
  const parent = scannerParentProfileId?.trim() ?? '';
  const discountProfile = discountGastroProfileId?.trim() ?? '';
  if (!parent || !discountProfile) return false;
  return parent === discountProfile;
}
