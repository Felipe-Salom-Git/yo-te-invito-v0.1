import {
  isCourtesyOnlyVisibility,
  isCourtesyValidityRangeValid,
} from './gastro-courtesy-lifecycle';
import {
  gastroCourtesyRecipientsPreviewQuerySchema,
  parseQueryBoolean,
} from './schemas/gastro-courtesy-discounts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

// --- G8.1 B2: query boolean must not use Boolean("false") === true ---
assert(parseQueryBoolean('false') === false, 'query "false" → false');
assert(parseQueryBoolean('FALSE') === false, 'query "FALSE" → false');
assert(parseQueryBoolean('0') === false, 'query "0" → false');
assert(parseQueryBoolean('') === false, 'query "" → false');
assert(parseQueryBoolean('true') === true, 'query "true" → true');
assert(parseQueryBoolean('1') === true, 'query "1" → true');
assert(parseQueryBoolean(true) === true, 'boolean true passes through');

const base = { gastroProfileId: 'profile-a' };
const off = gastroCourtesyRecipientsPreviewQuerySchema.parse({ ...base, sendToFollowers: 'false' });
assert(off.sendToFollowers === false, 'preview ?sendToFollowers=false is false (was true with z.coerce.boolean)');
const on = gastroCourtesyRecipientsPreviewQuerySchema.parse({ ...base, sendToFollowers: 'true' });
assert(on.sendToFollowers === true, 'preview ?sendToFollowers=true is true');
const omitted = gastroCourtesyRecipientsPreviewQuerySchema.parse(base);
assert(omitted.sendToFollowers === undefined, 'preview without sendToFollowers stays undefined');
assert(
  !gastroCourtesyRecipientsPreviewQuerySchema.safeParse({ ...base, sendToFollowers: 'maybe' }).success,
  'preview rejects non-boolean sendToFollowers',
);
const manual = gastroCourtesyRecipientsPreviewQuerySchema.parse({
  ...base,
  manualEmails: 'a@x.com, b@x.com',
  sendToFollowers: 'false',
});
assert(manual.manualEmails?.length === 2 && manual.sendToFollowers === false, 'manual emails only keeps followers off');

// --- G8.1 B6: validity window order ---
const d = (iso: string) => new Date(iso);
assert(
  isCourtesyValidityRangeValid(d('2026-10-23T00:00:00Z'), d('2026-10-30T23:59:59Z')),
  'validFrom < validTo is valid',
);
assert(
  isCourtesyValidityRangeValid(d('2026-10-23T00:00:00Z'), d('2026-10-23T00:00:00Z')),
  'same instant is valid',
);
assert(
  !isCourtesyValidityRangeValid(d('2026-11-01T00:00:00Z'), d('2026-10-30T23:59:59Z')),
  'validFrom after validTo is invalid',
);
assert(!isCourtesyValidityRangeValid(new Date('x'), d('2026-10-30T23:59:59Z')), 'invalid date is invalid');

// --- visibility helper ---
assert(isCourtesyOnlyVisibility('COURTESY_ONLY'), 'COURTESY_ONLY is courtesy');
assert(!isCourtesyOnlyVisibility('PUBLIC'), 'PUBLIC is not courtesy');
assert(!isCourtesyOnlyVisibility(null), 'null is not courtesy');
assert(!isCourtesyOnlyVisibility(undefined), 'undefined is not courtesy');

console.log('gastro-courtesy-lifecycle assertions passed');
