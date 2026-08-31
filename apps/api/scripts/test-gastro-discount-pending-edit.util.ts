/**
 * Unit checks for gastro discount pending-edit / material-change helpers.
 * Run: pnpm --filter api run test:gastro-discount-pending-edit
 */

import {
  applyDiscountUpdateToSnapshot,
  buildPendingUpdatePayload,
  gastroDiscountPendingUpdateSchema,
  getMaterialDiscountChanges,
  hasMaterialDiscountChanges,
  parsePendingUpdate,
  pendingUpdateToPublishedFields,
  shouldSubmitDiscountPendingEdit,
  snapshotFromPublishedRow,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const published = snapshotFromPublishedRow({
  displayTitle: '2x1 pizzas',
  summary: 'Promo almuerzo',
  detail: 'Válido con bebida',
  submittedImageUrls: ['https://cdn.example/a.jpg'],
  type: 'PERCENT',
  value: 10,
  validityMode: 'DATE_RANGE',
  validWeekday: null,
  validFrom: new Date('2026-09-01T03:00:00.000Z'),
  validTo: new Date('2026-09-30T02:59:59.999Z'),
  discountDate: new Date('2026-09-30T02:59:59.999Z'),
});

assert(shouldSubmitDiscountPendingEdit('ACTIVE'), 'ACTIVE submits pending edit');
assert(shouldSubmitDiscountPendingEdit('APPROVED'), 'APPROVED submits pending edit');
assert(
  !shouldSubmitDiscountPendingEdit('PENDING_REVIEW'),
  'PENDING_REVIEW stays in-place (new discount flow)',
);
assert(!shouldSubmitDiscountPendingEdit('CANCELLED'), 'CANCELLED does not pending-edit');
assert(!shouldSubmitDiscountPendingEdit('REJECTED'), 'REJECTED does not pending-edit');

const sameTitle = applyDiscountUpdateToSnapshot(published, {
  title: '  2x1 pizzas  ',
});
assert(
  !hasMaterialDiscountChanges(published, sameTitle),
  'whitespace-only title is not material',
);

const newTitle = applyDiscountUpdateToSnapshot(published, { title: '2x1 hamburguesas' });
assert(hasMaterialDiscountChanges(published, newTitle), 'title change is material');
assert(
  getMaterialDiscountChanges(published, newTitle).some((c) => c.field === 'title'),
  'title listed in changes',
);

const sameDates = applyDiscountUpdateToSnapshot(published, {
  validFrom: '2026-09-01',
  validTo: '2026-09-30',
  validityMode: 'DATE_RANGE',
});
assert(
  !hasMaterialDiscountChanges(published, sameDates),
  'same AR calendar days are not material',
);

const newDates = applyDiscountUpdateToSnapshot(
  published,
  { validFrom: '2026-09-01', validTo: '2026-10-15', validityMode: 'DATE_RANGE' },
  {
    validityMode: 'DATE_RANGE',
    validWeekday: null,
    validFrom: new Date('2026-09-01T03:00:00.000Z'),
    validTo: new Date('2026-10-16T02:59:59.999Z'),
    discountDate: new Date('2026-10-16T02:59:59.999Z'),
  },
);
assert(hasMaterialDiscountChanges(published, newDates), 'validTo change is material');

const weekly = applyDiscountUpdateToSnapshot(published, {
  validityMode: 'WEEKLY_RECURRING',
  validWeekday: 'FRIDAY',
});
assert(
  getMaterialDiscountChanges(published, weekly).some((c) => c.field === 'validityMode'),
  'validityMode change is material',
);

const extraRejected = gastroDiscountPendingUpdateSchema.safeParse({
  ...published,
  id: 'should-not-store',
  status: 'ACTIVE',
  tenantId: 't1',
});
assert(!extraRejected.success, 'pending schema rejects non-allowlisted keys (strict)');

const payload = buildPendingUpdatePayload(newTitle);
assert(payload.title === '2x1 hamburguesas', 'pending payload keeps proposed title');
assert(!('id' in payload), 'pending payload has no id');
assert(!('status' in payload), 'pending payload has no status');
assert(!('tenantId' in payload), 'pending payload has no tenantId');

assert(parsePendingUpdate(null) === null, 'null pending parses as null');
assert(parsePendingUpdate({ status: 'ACTIVE' }) === null, 'invalid pending parses as null');
assert(parsePendingUpdate(payload)?.title === '2x1 hamburguesas', 'valid pending parses');

const promoted = pendingUpdateToPublishedFields(payload);
assert(promoted.displayTitle === '2x1 hamburguesas', 'promote maps title to displayTitle');
assert(promoted.validityMode === 'DATE_RANGE', 'promote keeps date range');

const weeklyPayload = buildPendingUpdatePayload(weekly);
const weeklyFields = pendingUpdateToPublishedFields(weeklyPayload);
assert(weeklyFields.validFrom === null, 'weekly promote clears validFrom');
assert(weeklyFields.validWeekday === 'FRIDAY', 'weekly promote keeps weekday');

const valueChange = applyDiscountUpdateToSnapshot(published, { value: 50 });
assert(hasMaterialDiscountChanges(published, valueChange), 'value change is material');
assert(published.value === 10, 'published value unchanged after proposing 50');
assert(valueChange.value === 50, 'pending proposal has new value');
assert(
  getMaterialDiscountChanges(published, valueChange).some((c) => c.field === 'value'),
  'value listed in changes',
);
const valuePending = buildPendingUpdatePayload(valueChange);
assert(valuePending.value === 50, 'pending payload stores proposed value');
assert(published.value === 10, 'published snapshot still 10 after pending payload');

const typeChange = applyDiscountUpdateToSnapshot(published, { type: 'FIXED', value: 5000 });
assert(hasMaterialDiscountChanges(published, typeChange), 'type change is material');
assert(published.type === 'PERCENT', 'published type unchanged after proposing FIXED');
assert(typeChange.type === 'FIXED', 'pending proposal has new type');
const typePending = buildPendingUpdatePayload(typeChange);
assert(typePending.type === 'FIXED' && typePending.value === 5000, 'pending stores type+value');
assert(!('qrToken' in typePending), 'pending payload has no qrToken');
assert(!('shortCode' in typePending), 'pending payload has no shortCode');
assert(!('claims' in typePending), 'pending payload has no claims');

const promotedOffer = pendingUpdateToPublishedFields(typePending);
assert(promotedOffer.type === 'FIXED' && promotedOffer.value === 5000, 'approve promotes type/value');
assert(!('qrToken' in promotedOffer), 'promote does not touch QR');
assert(!('shortCode' in promotedOffer), 'promote does not touch shortCode');
assert(!('claims' in promotedOffer), 'promote does not touch claims');

assert(published.type === 'PERCENT' && published.value === 10, 'reject path: published type/value preserved');

console.log('\nAll gastro discount pending-edit util checks passed.');
