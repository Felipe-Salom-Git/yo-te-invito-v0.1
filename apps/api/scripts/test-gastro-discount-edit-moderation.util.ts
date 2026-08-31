/**
 * Admin pending-edit moderation helpers (promote/reject payload).
 * Run: pnpm --filter api run test:gastro-discount-edit-moderation
 */

import {
  getMaterialDiscountChanges,
  parsePendingUpdate,
  pendingUpdateToPublishedFields,
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
  displayTitle: '2x1',
  summary: 'Almuerzo',
  detail: 'Con bebida',
  submittedImageUrls: ['https://cdn.example/a.jpg'],
  validityMode: 'DATE_RANGE',
  validFrom: new Date('2026-09-01T03:00:00.000Z'),
  validTo: new Date('2026-09-30T02:59:59.999Z'),
  discountDate: new Date('2026-09-30T02:59:59.999Z'),
});

const proposed = {
  ...published,
  title: '3x2',
  summary: 'Cena',
};

const pending = parsePendingUpdate(proposed);
assert(pending != null, 'proposed snapshot parses as pending');

const promoted = pendingUpdateToPublishedFields(pending!);
assert(promoted.displayTitle === '3x2', 'approve promotes proposed title');
assert(promoted.summary === 'Cena', 'approve promotes proposed summary');
assert(
  !('qrToken' in promoted) && !('status' in promoted) && !('claims' in promoted),
  'promote payload has no qr/status/claims',
);
assert(
  !('tenantId' in promoted) && !('gastroProfileId' in promoted),
  'promote payload has no identity/tenant fields',
);

const changes = getMaterialDiscountChanges(published, proposed);
assert(
  changes.some((c) => c.field === 'title' && c.from === '2x1' && c.to === '3x2'),
  'admin diff lists published vs proposed title',
);

assert(parsePendingUpdate(null) === null, 'reject path: missing pending is null');
assert(
  parsePendingUpdate({ id: 'x', status: 'ACTIVE', title: 'x' }) === null,
  'mass-assignment keys cannot be parsed as pending',
);

console.log('\nAll gastro discount edit-moderation util checks passed.');
