import type {
  ProducerReviewDisputeFilter,
  ProducerReviewReplyFilter,
  ReviewPublicStatus,
} from '@yo-te-invito/shared';
import type { ManagedReviewsQuickFilter } from './managed-reviews-filters';

export type ManagedReviewsUrlState = {
  quick: ManagedReviewsQuickFilter;
  eventId: string;
  overallRating: string;
  disputeStatus: ProducerReviewDisputeFilter;
  replyFilter: ProducerReviewReplyFilter;
  publicStatus: '' | ReviewPublicStatus;
  sort: 'newest' | 'oldest' | 'highest' | 'lowest';
  page: number;
};

const QUICK_VALUES = new Set<ManagedReviewsQuickFilter>([
  'all',
  'unanswered',
  'answered',
  'open_dispute',
  'highest',
  'lowest',
]);

const SORT_VALUES = new Set(['newest', 'oldest', 'highest', 'lowest']);

export function parseManagedReviewsUrl(
  params: URLSearchParams,
): Partial<ManagedReviewsUrlState> {
  const out: Partial<ManagedReviewsUrlState> = {};
  const quick = params.get('quick');
  if (quick && QUICK_VALUES.has(quick as ManagedReviewsQuickFilter)) {
    out.quick = quick as ManagedReviewsQuickFilter;
  }
  const eventId = params.get('event');
  if (eventId) out.eventId = eventId;
  const rating = params.get('rating');
  if (rating) out.overallRating = rating;
  const dispute = params.get('dispute');
  if (dispute) out.disputeStatus = dispute as ProducerReviewDisputeFilter;
  const reply = params.get('reply');
  if (reply) out.replyFilter = reply as ProducerReviewReplyFilter;
  const status = params.get('status');
  if (status) out.publicStatus = status as ReviewPublicStatus;
  const sort = params.get('sort');
  if (sort && SORT_VALUES.has(sort)) {
    out.sort = sort as ManagedReviewsUrlState['sort'];
  }
  const page = params.get('page');
  if (page) {
    const n = Number(page);
    if (Number.isFinite(n) && n >= 1) out.page = n;
  }
  return out;
}

export function buildManagedReviewsSearchParams(
  state: ManagedReviewsUrlState,
): URLSearchParams {
  const p = new URLSearchParams();
  if (state.quick !== 'all') p.set('quick', state.quick);
  if (state.eventId) p.set('event', state.eventId);
  if (state.overallRating) p.set('rating', state.overallRating);
  if (state.disputeStatus !== 'ALL') p.set('dispute', state.disputeStatus);
  if (state.replyFilter !== 'ALL') p.set('reply', state.replyFilter);
  if (state.publicStatus) p.set('status', state.publicStatus);
  if (state.sort !== 'newest') p.set('sort', state.sort);
  if (state.page > 1) p.set('page', String(state.page));
  return p;
}
