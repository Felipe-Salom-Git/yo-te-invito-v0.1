/**
 * G8.9 — Web assertions for the courtesy portal (pure helpers + cross-profile cache keys).
 * Run: pnpm --filter api run test:gastro-courtesy-portal
 */
import { adminGastroKeys, gastroKeys } from '../query/keys';
import {
  buildCourtesyMetricCards,
  discountTypeParam,
  formatCourtesyAudience,
  parseDiscountTypeParam,
  resolveCourtesyEmptyState,
} from './courtesy-portal';
import { resolveCourtesyScope, withCourtesyProfileQuery } from './courtesy-scope';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const same = (a: readonly unknown[], b: readonly unknown[]) => JSON.stringify(a) === JSON.stringify(b);

// G8.9.11 — Local A → B never shares a cached list / detail.
assert(!same(gastroKeys.discounts('local-a'), gastroKeys.discounts('local-b')), 'list key A ≠ B');
assert(!same(gastroKeys.discounts('local-a'), gastroKeys.discounts(undefined)), 'list key A ≠ implicit default');
assert(same(gastroKeys.discounts('local-a'), gastroKeys.discounts('local-a')), 'list key A stable');
assert(
  !same(adminGastroKeys.discounts('local-a'), adminGastroKeys.discounts('local-b')),
  'admin list key A ≠ B',
);
assert(
  !same(adminGastroKeys.discountSummary('local-a', 'd1'), adminGastroKeys.discountSummary('local-b', 'd1')),
  'admin summary key carries the route local',
);

const locations = [
  { id: 'local-a', status: 'ACTIVE' },
  { id: 'local-b', status: 'ACTIVE' },
];
const scopeB = resolveCourtesyScope('local-b', locations);
assert(scopeB.ok && scopeB.profileId === 'local-b', 'request form keeps the selected local B');
assert(
  withCourtesyProfileQuery('/gastro/descuentos?tipo=cortesias', 'local-b') ===
    '/gastro/descuentos?tipo=cortesias&profileId=local-b',
  'courtesy list link keeps profileId + tipo',
);

// ?tipo= filter
assert(parseDiscountTypeParam('cortesias') === 'COURTESY_ONLY', '?tipo=cortesias → courtesies');
assert(parseDiscountTypeParam('descuentos') === 'PUBLIC', '?tipo=descuentos → discounts');
assert(parseDiscountTypeParam(null) === 'ALL' && parseDiscountTypeParam('x') === 'ALL', 'unknown → ALL');
assert(discountTypeParam('COURTESY_ONLY') === 'cortesias' && discountTypeParam('ALL') === null, 'filter → param');

// Audience
assert(
  formatCourtesyAudience({ recipientCount: 3, manualRecipientCount: 2, followerRecipientCount: 1 }) ===
    '3 destinatarios · 2 por email · 1 seguidor',
  'audience breakdown text',
);
assert(
  formatCourtesyAudience({ recipientCount: 1, manualRecipientCount: 1, followerRecipientCount: 0 }) ===
    '1 destinatario · 1 por email',
  'single recipient, no followers',
);

// Metric cards: retained only when > 0, never as delivered.
const metrics = {
  recipientCount: 3,
  manualRecipientCount: 3,
  followerRecipientCount: 0,
  registeredRecipientCount: 0,
  retainedClaims: 3,
  availableClaims: 0,
  deliveredClaims: 0,
  pendingDeliveryClaims: 0,
  usedClaims: 0,
  cancelledClaims: 0,
  expiredClaims: 0,
};
const pendingCards = buildCourtesyMetricCards(metrics);
assert(pendingCards.some((c) => c.key === 'retainedClaims' && c.value === 3), 'pending → retained card');
assert(pendingCards.find((c) => c.key === 'deliveredClaims')?.value === 0, 'retained never counted as delivered');
const liveCards = buildCourtesyMetricCards(
  { ...metrics, retainedClaims: 0, availableClaims: 2, deliveredClaims: 2, pendingDeliveryClaims: 1 },
  { includePendingDelivery: true },
);
assert(!liveCards.some((c) => c.key === 'retainedClaims'), 'approved → no retained card');
assert(liveCards.some((c) => c.key === 'pendingDeliveryClaims'), 'admin sees pending delivery');
assert(
  !buildCourtesyMetricCards({ ...metrics, pendingDeliveryClaims: 1 }).some((c) => c.key === 'pendingDeliveryClaims'),
  'owner does not see pending delivery',
);

// G8.9.10 — Empty states
const none = { ACTIVE: 0, PENDING: 0, FINISHED: 0, ARCHIVED: 0 };
const zero = resolveCourtesyEmptyState({ bucket: 'ACTIVE', countsByBucket: none, canCreate: true });
assert(zero.title === 'Todavía no creaste cortesías para este local.' && zero.showCreate, '0 cortesías → CTA');
const zeroInactive = resolveCourtesyEmptyState({ bucket: 'ACTIVE', countsByBucket: none, canCreate: false });
assert(!zeroInactive.showCreate, 'inactive local → no create CTA');
const onlyPending = resolveCourtesyEmptyState({
  bucket: 'ACTIVE',
  countsByBucket: { ...none, PENDING: 2 },
  canCreate: true,
});
assert(
  onlyPending.title === 'No hay cortesías activas en este local.' &&
    onlyPending.description === 'Este local tiene 2 pendientes de aprobación.',
  'solo pendientes → points to the pending tab',
);
const onlyActive = resolveCourtesyEmptyState({
  bucket: 'PENDING',
  countsByBucket: { ...none, ACTIVE: 1 },
  canCreate: true,
});
assert(onlyActive.title === 'No hay cortesías pendientes de aprobación.', 'solo activas → pending tab empty');
const onlyCancelled = resolveCourtesyEmptyState({
  bucket: 'ACTIVE',
  countsByBucket: { ...none, FINISHED: 4 },
  canCreate: true,
});
assert(onlyCancelled.description === 'Este local tiene 4 finalizadas.', 'solo canceladas → finished hint');

console.log('courtesy-portal assertions passed');
