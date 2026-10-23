/**
 * G8.1 — Scope helpers for /gastro/descuentos/cortesia.
 *
 * The courtesy form MUST send for the *selected* local (`?profileId=`), never for the
 * API's implicit default local. Everything is scoped by tenant (JWT) + `gastroProfileId`.
 */

type LocationRef = { id: string; status: string };

export type CourtesyScopeResolution =
  | { ok: true; profileId: string }
  | { ok: false; reason: 'NO_LOCATION' | 'NOT_ACTIVE' };

/** Resolves the profile to send for, rejecting unknown or non-ACTIVE locals. */
export function resolveCourtesyScope(
  activeProfileId: string | undefined,
  locations: readonly LocationRef[],
): CourtesyScopeResolution {
  if (!activeProfileId) return { ok: false, reason: 'NO_LOCATION' };
  const location = locations.find((l) => l.id === activeProfileId);
  if (!location) return { ok: false, reason: 'NO_LOCATION' };
  if (location.status !== 'ACTIVE') return { ok: false, reason: 'NOT_ACTIVE' };
  return { ok: true, profileId: location.id };
}

/** Appends `?profileId=` (preserving the selected local across portal navigation). */
export function withCourtesyProfileQuery(path: string, profileId: string | undefined): string {
  if (!profileId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}profileId=${encodeURIComponent(profileId)}`;
}

export type DiscountVisibilityFilter = 'ALL' | 'PUBLIC' | 'COURTESY_ONLY';

/** Visibility filter for the owner's discount list (missing visibility ⇒ PUBLIC). */
export function matchesVisibilityFilter(
  visibility: 'PUBLIC' | 'COURTESY_ONLY' | undefined,
  filter: DiscountVisibilityFilter,
): boolean {
  if (filter === 'ALL') return true;
  return (visibility ?? 'PUBLIC') === filter;
}
