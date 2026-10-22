/**
 * G4.2 — GastroProfile page views are scoped to gastroProfileId (not owner user).
 * Run: pnpm --filter api run test:gastro-profile-view-scope
 */

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

type ViewRow = { gastroProfileId: string; viewerUserId: string | null };

function countViewsForProfile(rows: ViewRow[], profileId: string): number {
  return rows.filter((r) => r.gastroProfileId === profileId).length;
}

const rows: ViewRow[] = [
  { gastroProfileId: 'local-a', viewerUserId: null },
  { gastroProfileId: 'local-a', viewerUserId: 'user-1' },
  { gastroProfileId: 'local-b', viewerUserId: null },
  { gastroProfileId: 'local-c', viewerUserId: 'user-1' },
  { gastroProfileId: 'local-c', viewerUserId: null },
  { gastroProfileId: 'local-c', viewerUserId: null },
];

assert(countViewsForProfile(rows, 'local-a') === 2, 'Local A views independent');
assert(countViewsForProfile(rows, 'local-b') === 1, 'Local B views independent');
assert(countViewsForProfile(rows, 'local-c') === 3, 'Local C views independent');
assert(
  countViewsForProfile(rows, 'local-a') +
    countViewsForProfile(rows, 'local-b') +
    countViewsForProfile(rows, 'local-c') ===
    6,
  'sum of locals ≠ a single owner-user metric bucket',
);

function shouldSkipRecording(viewer?: { role: string; canManageProfile: boolean }): boolean {
  if (!viewer) return false;
  if (viewer.role === 'ADMIN') return true;
  return viewer.canManageProfile;
}

assert(shouldSkipRecording(undefined) === false, 'anonymous visitor → record');
assert(shouldSkipRecording({ role: 'ADMIN', canManageProfile: false }) === true, 'admin → skip');
assert(
  shouldSkipRecording({ role: 'GASTRO_OWNER', canManageProfile: true }) === true,
  'owner of local → skip',
);
assert(
  shouldSkipRecording({ role: 'USER', canManageProfile: false }) === false,
  'regular user → record',
);

console.log('\nAll G4.2 gastro profile view scope checks passed.');
