/**
 * G2.1 — Canonical primary subcategory name from multi-list + legacy fallback.
 * Run: pnpm --filter api run test:gastro-primary-subcategory-name
 */

import { resolveGastroPrimarySubcategoryName } from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(
  resolveGastroPrimarySubcategoryName({
    subcategoryName: 'Legacy Only',
    subcategories: null,
  }) === 'Legacy Only',
  'legacy name when no multi-list',
);

assert(
  resolveGastroPrimarySubcategoryName({
    subcategoryName: 'Legacy',
    subcategories: [
      { name: 'Parrilla', isPrimary: false },
      { name: 'Restaurante', isPrimary: true },
      { name: 'Bar', isPrimary: false },
    ],
  }) === 'Restaurante',
  'isPrimary wins over legacy',
);

assert(
  resolveGastroPrimarySubcategoryName({
    subcategoryName: null,
    subcategories: [
      { name: 'Cervecería', isPrimary: false },
      { name: 'Bar', isPrimary: false },
    ],
  }) === 'Cervecería',
  'first entry when no isPrimary',
);

assert(
  resolveGastroPrimarySubcategoryName({
    subcategoryName: '  ',
    subcategories: [],
  }) === null,
  'empty/whitespace → null',
);

console.log('\nAll G2.1 primary-subcategory-name checks passed.');
