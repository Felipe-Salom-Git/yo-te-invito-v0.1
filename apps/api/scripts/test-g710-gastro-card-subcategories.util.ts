import {
  resolveGastroSubcategoryNames,
  truncateSubcategoryChips,
} from '@yo-te-invito/shared';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const names = resolveGastroSubcategoryNames({
  subcategoryName: 'Restaurante',
  subcategories: [
    { name: 'Parrilla', isPrimary: false },
    { name: 'Restaurante', isPrimary: true },
    { name: 'Bar' },
  ],
});
assert(names[0] === 'Restaurante', 'primary first');
assert(names.includes('Parrilla') && names.includes('Bar'), 'all three');

const legacy = resolveGastroSubcategoryNames({
  subcategoryName: 'Café',
  subcategories: [],
});
assert(legacy.length === 1 && legacy[0] === 'Café', 'legacy fallback');

const chips = truncateSubcategoryChips(['Restaurante', 'Parrilla', 'Bar'], 2);
assert(chips.visible.length === 2, 'visible 2');
assert(chips.hiddenCount === 1, 'overflow +1');

console.log('OK: G7.10.3 gastro card subcategory chips helpers');
