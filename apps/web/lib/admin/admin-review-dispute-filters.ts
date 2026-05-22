import type { PublicReviewCategory } from '@yo-te-invito/shared';
import type { ReviewDisputeStatus } from '@/repositories/interfaces';

export type AdminReviewDisputeFiltersState = {
  status: ReviewDisputeStatus | '';
  category: PublicReviewCategory | '';
  q: string;
  page: number;
};

export const ADMIN_REVIEW_DISPUTE_DEFAULT_FILTERS: AdminReviewDisputeFiltersState = {
  status: '',
  category: '',
  q: '',
  page: 1,
};

export function parseAdminReviewDisputeSearchParams(
  params: URLSearchParams,
): AdminReviewDisputeFiltersState {
  const status = params.get('status') ?? '';
  const category = params.get('category') ?? '';
  return {
    status: status as ReviewDisputeStatus | '',
    category: category as PublicReviewCategory | '',
    q: params.get('q') ?? '',
    page: Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1),
  };
}

export function buildAdminReviewDisputeSearchParams(
  state: AdminReviewDisputeFiltersState,
): URLSearchParams {
  const qs = new URLSearchParams();
  if (state.status) qs.set('status', state.status);
  if (state.category) qs.set('category', state.category);
  if (state.q.trim()) qs.set('q', state.q.trim());
  if (state.page > 1) qs.set('page', String(state.page));
  return qs;
}

export function filtersToAdminReviewDisputeQuery(
  state: AdminReviewDisputeFiltersState,
  limit = 30,
) {
  return {
    status: state.status || undefined,
    category: state.category || undefined,
    q: state.q.trim() || undefined,
    page: state.page,
    limit,
  };
}

export function hasActiveAdminReviewDisputeFilters(
  state: AdminReviewDisputeFiltersState,
): boolean {
  return Boolean(state.status || state.category || state.q.trim());
}
