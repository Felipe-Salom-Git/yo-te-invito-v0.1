/**
 * G9.6 — Discount empty states say what is missing and when to offer Crear descuento.
 * Run: pnpm --filter api run test:gastro-empty-states
 */
import { resolvePublicDiscountEmptyState } from './discount-empty';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const none = { ACTIVE: 0, PENDING: 0, FINISHED: 0, ARCHIVED: 0 };
const zero = resolvePublicDiscountEmptyState({ bucket: 'ACTIVE', countsByBucket: none });
assert(
  zero.title === 'Todavía no cargaste descuentos para este local.' && zero.showCreate,
  'no discounts → create CTA',
);
const onlyPending = resolvePublicDiscountEmptyState({
  bucket: 'ACTIVE',
  countsByBucket: { ...none, PENDING: 1 },
});
assert(onlyPending.title === 'No hay descuentos activos en este local.', 'other tab is named');
assert(
  !resolvePublicDiscountEmptyState({ bucket: 'ARCHIVED', countsByBucket: { ...none, ACTIVE: 1 } }).showCreate,
  'archived tab does not push create',
);

console.log('OK: gastro discount empty states');
