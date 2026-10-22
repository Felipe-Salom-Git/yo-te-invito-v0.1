import { resolveActiveGastroProfileId } from '../gastro/resolve-active-profile-id';
import {
  mergeManagedReviewsSearchParams,
  type ManagedReviewsUrlState,
} from './managed-reviews-url';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const DEFAULT_STATE: ManagedReviewsUrlState = {
  quick: 'all',
  eventId: '',
  overallRating: '',
  disputeStatus: 'ALL',
  replyFilter: 'ALL',
  publicStatus: '',
  sort: 'newest',
  page: 1,
};

const locations = [
  { id: 'local-a', status: 'ACTIVE' },
  { id: 'local-b', status: 'ACTIVE' },
];

const activeAfterSync = (url: string, state: ManagedReviewsUrlState = DEFAULT_STATE) =>
  resolveActiveGastroProfileId(
    mergeManagedReviewsSearchParams(new URLSearchParams(url), state).get('profileId') ?? undefined,
    locations,
  );

// Local A → reviews A
assert(activeAfterSync('profileId=local-a') === 'local-a', 'local A stays active after filter sync');

// Switch to Local B → reviews B, never falls back to A
assert(activeAfterSync('profileId=local-b') === 'local-b', 'switch to local B survives filter sync');
assert(
  activeAfterSync('profileId=local-b&quick=unanswered', { ...DEFAULT_STATE, quick: 'unanswered' }) ===
    'local-b',
  'switch to local B with active filters keeps B',
);

const merged = mergeManagedReviewsSearchParams(new URLSearchParams('profileId=local-b&page=3&sort=lowest'), {
  ...DEFAULT_STATE,
  sort: 'lowest',
});
assert(merged.get('profileId') === 'local-b', 'foreign params preserved');
assert(merged.get('page') === null, 'managed keys rewritten from state (page reset)');
assert(merged.get('sort') === 'lowest', 'managed keys rebuilt');

assert(resolveActiveGastroProfileId('foreign-profile', locations) === 'local-a', 'foreign profileId ignored');
assert(
  resolveActiveGastroProfileId(undefined, [
    { id: 'p', status: 'PENDING' },
    { id: 'a', status: 'ACTIVE' },
  ]) === 'a',
  'first ACTIVE fallback',
);

console.log('OK: managed reviews URL sync keeps gastro active profile (A → B, never back to A)');
