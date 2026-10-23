import {
  matchesVisibilityFilter,
  resolveCourtesyScope,
  withCourtesyProfileQuery,
} from './courtesy-scope';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const locations = [
  { id: 'local-a', status: 'ACTIVE' },
  { id: 'local-b', status: 'ACTIVE' },
  { id: 'local-draft', status: 'DRAFT' },
];

// Selected local is used (not the implicit default = first)
const b = resolveCourtesyScope('local-b', locations);
assert(b.ok && b.profileId === 'local-b', 'sends for the selected local B, not default A');

const a = resolveCourtesyScope('local-a', locations);
assert(a.ok && a.profileId === 'local-a', 'sends for local A when A is selected');

// Foreign / unknown profile is never accepted
const foreign = resolveCourtesyScope('local-x', locations);
assert(!foreign.ok && foreign.reason === 'NO_LOCATION', 'foreign profileId rejected');

const none = resolveCourtesyScope(undefined, locations);
assert(!none.ok && none.reason === 'NO_LOCATION', 'no active profile → no send');

const empty = resolveCourtesyScope('local-a', []);
assert(!empty.ok, 'no locations → no send');

const draft = resolveCourtesyScope('local-draft', locations);
assert(!draft.ok && draft.reason === 'NOT_ACTIVE', 'non-ACTIVE local cannot send courtesies');

// profileId survives navigation
assert(
  withCourtesyProfileQuery('/gastro/descuentos', 'local-b') === '/gastro/descuentos?profileId=local-b',
  'profileId appended',
);
assert(
  withCourtesyProfileQuery('/gastro/descuentos?x=1', 'a b') === '/gastro/descuentos?x=1&profileId=a%20b',
  'profileId appended with & and encoded',
);
assert(withCourtesyProfileQuery('/gastro/descuentos', undefined) === '/gastro/descuentos', 'no profileId → path unchanged');

// Visibility filter
assert(matchesVisibilityFilter(undefined, 'PUBLIC'), 'missing visibility counts as PUBLIC');
assert(!matchesVisibilityFilter(undefined, 'COURTESY_ONLY'), 'missing visibility is not a courtesy');
assert(matchesVisibilityFilter('COURTESY_ONLY', 'COURTESY_ONLY'), 'courtesy matches courtesy filter');
assert(!matchesVisibilityFilter('COURTESY_ONLY', 'PUBLIC'), 'courtesy hidden from PUBLIC filter');
assert(matchesVisibilityFilter('COURTESY_ONLY', 'ALL') && matchesVisibilityFilter('PUBLIC', 'ALL'), 'ALL matches both');

console.log('courtesy-scope assertions passed');
