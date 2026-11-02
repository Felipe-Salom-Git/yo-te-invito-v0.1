import type { ScannerAccountSummary, ScannerParentProfileOption } from '@yo-te-invito/shared';

export type ScannerAccountGroup = {
  profileId: string;
  displayName: string;
  isPrimary: boolean;
  accounts: ScannerAccountSummary[];
};

/**
 * G11.2 — Gastro portal scanners grouped by location.
 * Every managed location gets a group (even without scanners), primary first, then by name.
 * Accounts whose location is not in `profiles` (e.g. options not loaded) still get their own
 * group from `parentDisplayName`, so nothing returned by the API is hidden.
 * Scanners agrupados por local; los locales sin scanners también aparecen.
 */
export function groupScannerAccountsByProfile(
  accounts: ScannerAccountSummary[],
  profiles: ScannerParentProfileOption[],
): ScannerAccountGroup[] {
  const byProfile = new Map<string, ScannerAccountSummary[]>();
  for (const account of accounts) {
    const list = byProfile.get(account.parentProfileId) ?? [];
    list.push(account);
    byProfile.set(account.parentProfileId, list);
  }

  const groups: ScannerAccountGroup[] = profiles.map((profile) => ({
    profileId: profile.id,
    displayName: profile.displayName,
    isPrimary: Boolean(profile.isPrimary),
    accounts: byProfile.get(profile.id) ?? [],
  }));

  const known = new Set(profiles.map((p) => p.id));
  for (const [profileId, list] of byProfile) {
    if (known.has(profileId)) continue;
    groups.push({
      profileId,
      displayName: list[0]?.parentDisplayName?.trim() || 'Local',
      isPrimary: false,
      accounts: list,
    });
  }

  return groups.sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.displayName.localeCompare(b.displayName, 'es');
  });
}
