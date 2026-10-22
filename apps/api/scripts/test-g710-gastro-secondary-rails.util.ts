/**
 * G7.10.4 — secondary subcategory must match rails/search (EventSubcategory OR legacy FK).
 * Case: primary A + secondary B → filter B includes the profile's public event.
 */
import { subcategoryFilterWhere } from '../src/common/event-subcategories.util';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function matchesFilter(
  event: {
    subcategoryId: string | null;
    eventSubcategories: Array<{ subcategoryId: string }>;
  },
  filterSubcategoryId: string,
): boolean {
  if (event.subcategoryId === filterSubcategoryId) return true;
  return event.eventSubcategories.some((r) => r.subcategoryId === filterSubcategoryId);
}

const clause = subcategoryFilterWhere('tenant-demo', 'gastro', {
  subcategoryId: 'sc-parrilla',
});
assert(clause?.OR?.length === 2, 'filter OR legacy + junction');

const profileEvent = {
  id: 'evt-local-a',
  subcategoryId: 'sc-restaurante', // primary A
  eventSubcategories: [
    { subcategoryId: 'sc-restaurante' },
    { subcategoryId: 'sc-parrilla' }, // secondary B
    { subcategoryId: 'sc-bar' },
  ],
};

assert(
  matchesFilter(profileEvent, 'sc-restaurante'),
  'appears in primary rail A',
);
assert(
  matchesFilter(profileEvent, 'sc-parrilla'),
  'appears in secondary rail B',
);
assert(
  matchesFilter(profileEvent, 'sc-bar'),
  'appears in secondary rail C',
);
assert(
  !matchesFilter(profileEvent, 'sc-cafe'),
  'does not appear in unrelated rail',
);

const slugClause = subcategoryFilterWhere('tenant-demo', 'gastro', {
  subcategorySlug: 'parrilla',
});
assert(
  JSON.stringify(slugClause).includes('eventSubcategories'),
  'slug rails also use EventSubcategory junction',
);

console.log('OK: G7.10.4 secondary gastro subcategory rails matching');
