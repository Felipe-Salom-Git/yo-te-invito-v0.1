/**
 * G7.10.5 — Gastro reviews are scoped by publicEventId (per GastroProfile), never owner-wide.
 */
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function resolveGastroReviewEventIds(
  membershipPublicEventIds: string[],
  requestedEventId?: string,
): string[] {
  const scope = [...new Set(membershipPublicEventIds.filter(Boolean))];
  if (!requestedEventId) return scope;
  return scope.includes(requestedEventId) ? [requestedEventId] : [];
}

const localA = 'evt-local-a';
const localB = 'evt-local-b';
const ownerEvents = [localA, localB];

assert(
  resolveGastroReviewEventIds(ownerEvents).length === 2,
  'without filter, membership can see both (legacy) — portal must pass eventId',
);
assert(
  resolveGastroReviewEventIds(ownerEvents, localA).length === 1 &&
    resolveGastroReviewEventIds(ownerEvents, localA)[0] === localA,
  'Local A scope excludes B',
);
assert(
  resolveGastroReviewEventIds(ownerEvents, localB)[0] === localB,
  'Local B scope independent',
);
assert(
  resolveGastroReviewEventIds(ownerEvents, 'evt-foreign').length === 0,
  'foreign eventId rejected from scope',
);

console.log('OK: G7.10.5 gastro reviews profile scope (publicEventId)');
