/**
 * G3.2 — Content mutations must key off gastroProfileId (not eventId alone).
 * Run: pnpm --filter api run test:gastro-content-profile-scope
 */

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

/** Mirrors loadContentForManage ownership gate used before update/archive. */
function contentBelongsToManagedProfile(
  content: { tenantId: string; gastroProfileId: string },
  access: { tenantId: string; managedProfileIds: string[] },
): boolean {
  if (content.tenantId !== access.tenantId) return false;
  return access.managedProfileIds.includes(content.gastroProfileId);
}

assert(
  contentBelongsToManagedProfile(
    { tenantId: 't1', gastroProfileId: 'p-a' },
    { tenantId: 't1', managedProfileIds: ['p-a', 'p-b'] },
  ),
  'same tenant + membership profile → OK',
);

assert(
  !contentBelongsToManagedProfile(
    { tenantId: 't1', gastroProfileId: 'p-b' },
    { tenantId: 't1', managedProfileIds: ['p-a'] },
  ),
  'cross-profile same tenant → REJECT',
);

assert(
  !contentBelongsToManagedProfile(
    { tenantId: 't2', gastroProfileId: 'p-a' },
    { tenantId: 't1', managedProfileIds: ['p-a'] },
  ),
  'cross-tenant → REJECT',
);

/** Reorder must reject foreign ids even if caller knows the contentId. */
function reorderIdsAllOwned(orderedIds: string[], ownedIds: string[]): boolean {
  return orderedIds.every((id) => ownedIds.includes(id));
}

assert(
  reorderIdsAllOwned(['c1', 'c2'], ['c1', 'c2', 'c3']),
  'reorder accepts owned set',
);
assert(
  !reorderIdsAllOwned(['c1', 'foreign'], ['c1', 'c2']),
  'reorder rejects foreign contentId',
);

console.log('\nAll G3.2 gastro content profile-scope checks passed.');
