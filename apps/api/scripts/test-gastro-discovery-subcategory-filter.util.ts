/**
 * G2.5 — Discovery matching uses legacy FK OR EventSubcategory junction (not primary-only).
 * Run: pnpm --filter api run test:gastro-discovery-subcategory-filter
 */

import { subcategoryFilterWhere } from '../src/common/event-subcategories.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const byId = subcategoryFilterWhere('tenant-1', 'gastro', { subcategoryId: 'sc-bar' });
assert(!!byId?.OR && Array.isArray(byId.OR) && byId.OR.length === 2, 'id filter is OR of 2 branches');

const legacyBranch = byId!.OR![0] as { subcategoryId?: string };
const junctionBranch = byId!.OR![1] as {
  eventSubcategories?: { some?: { subcategoryId?: string } };
};
assert(legacyBranch.subcategoryId === 'sc-bar', 'matches legacy Event.subcategoryId');
assert(
  junctionBranch.eventSubcategories?.some?.subcategoryId === 'sc-bar',
  'matches secondary EventSubcategory rows',
);

const bySlug = subcategoryFilterWhere('tenant-1', 'gastro', { subcategorySlug: 'parrilla' });
assert(!!bySlug?.OR && bySlug.OR.length === 2, 'slug filter is OR of 2 branches');

const noFilter = subcategoryFilterWhere('tenant-1', 'gastro', {});
assert(noFilter === null, 'empty filter → no clause');

console.log('\nAll G2.5 gastro discovery subcategory filter checks passed.');
console.log(
  'Note: list/home cards may still display primary subcategoryName only; matching uses full N:N.',
);
