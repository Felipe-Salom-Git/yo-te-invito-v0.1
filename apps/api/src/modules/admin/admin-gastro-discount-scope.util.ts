/**
 * Admin gastro discount routes are nested under a GastroProfile id.
 * Belonging to the same tenant (or same GASTRO owner) is not enough —
 * the discount's canonical profile must match the path/query profileId.
 */

export function adminDiscountMatchesRouteProfile(
  routeProfileId: string | null | undefined,
  canonicalGastroProfileId: string | null | undefined,
): boolean {
  const route = routeProfileId?.trim() ?? '';
  const canonical = canonicalGastroProfileId?.trim() ?? '';
  if (!route || !canonical) return false;
  return route === canonical;
}
