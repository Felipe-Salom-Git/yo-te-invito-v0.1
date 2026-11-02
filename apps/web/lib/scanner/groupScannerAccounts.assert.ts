/**
 * G11.2 — Gastro portal scanners: all accounts, grouped by location.
 * Run: pnpm --filter api run test:gastro-scanners-grouped
 */
import type { ScannerAccountSummary } from '@yo-te-invito/shared';
import { groupScannerAccountsByProfile } from './groupScannerAccounts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

function account(id: string, parentProfileId: string, parentDisplayName: string): ScannerAccountSummary {
  return {
    id,
    scannerUserId: `u-${id}`,
    username: id,
    firstName: '',
    lastName: '',
    userStatus: 'ACTIVE',
    isActive: true,
    parentProfileType: 'GASTRO',
    parentProfileId,
    parentDisplayName,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
  };
}

// 0 locations.
assert(groupScannerAccountsByProfile([], []).length === 0, '0 locations → no groups');

// Locations without scanners.
const empty = groupScannerAccountsByProfile([], [
  { id: 'b', displayName: 'Bodegón' },
  { id: 'a', displayName: 'Alma', isPrimary: true },
]);
assert(empty.length === 2 && empty.every((g) => g.accounts.length === 0), 'locations without scanners still listed');
assert(empty[0]!.profileId === 'a', 'primary location first');

// Multiple locations, multiple scanners.
const groups = groupScannerAccountsByProfile(
  [account('s1', 'b', 'Bodegón'), account('s2', 'a', 'Alma'), account('s3', 'b', 'Bodegón')],
  [
    { id: 'a', displayName: 'Alma', isPrimary: true },
    { id: 'b', displayName: 'Bodegón' },
    { id: 'c', displayName: 'Café' },
  ],
);
assert(groups.map((g) => g.profileId).join(',') === 'a,b,c', 'groups: primary, then by name');
assert(groups[1]!.accounts.map((a) => a.id).join(',') === 's1,s3', 'each scanner sits under its own location');
assert(groups[2]!.accounts.length === 0, 'location without scanners keeps an empty group');
assert(
  groups.reduce((n, g) => n + g.accounts.length, 0) === 3,
  'every scanner returned by the API is shown exactly once',
);

// Account whose location is missing from the options is not dropped.
const orphan = groupScannerAccountsByProfile([account('s9', 'z', 'Zeta')], [{ id: 'a', displayName: 'Alma' }]);
assert(orphan.some((g) => g.profileId === 'z' && g.displayName === 'Zeta'), 'unknown location keeps its own group');

console.log('OK: gastro scanners grouped by location');
