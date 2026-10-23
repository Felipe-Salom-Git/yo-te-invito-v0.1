/**
 * G9.5 — Gastro cards keep primary + one secondary and do not dump every tag.
 * Run: pnpm --filter api run test:gastro-card-chips
 */
import { truncateSubcategoryChips } from '@yo-te-invito/shared';
import {
  GASTRO_CARD_SUBCATEGORY_MAX_DESKTOP,
  GASTRO_CARD_SUBCATEGORY_MAX_MOBILE,
  GASTRO_CARD_TAG_MAX_WITH_SUBCATEGORIES,
} from './gastroCardChipLimits';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

assert(
  GASTRO_CARD_SUBCATEGORY_MAX_MOBILE === 2 && GASTRO_CARD_SUBCATEGORY_MAX_DESKTOP === 2,
  'mobile and desktop show two subcategory chips',
);
assert(GASTRO_CARD_TAG_MAX_WITH_SUBCATEGORIES === 1, 'tags stay to one chip beside subcategories');

const chips = truncateSubcategoryChips(['Parrilla', 'Pasta', 'Vino', 'Postres'], GASTRO_CARD_SUBCATEGORY_MAX_DESKTOP);
assert(chips.visible.join(',') === 'Parrilla,Pasta', 'primary then secondary');
assert(chips.hiddenCount === 2, '+2 overflow');

console.log('OK: gastro card chips');
