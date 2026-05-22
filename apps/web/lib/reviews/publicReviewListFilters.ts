import type {
  ProducerReviewReplyFilter,
  PublicReviewListFilters,
  PublicReviewListSort,
} from '@yo-te-invito/shared';

export const DEFAULT_PUBLIC_REVIEW_LIST_FILTERS: PublicReviewListFilters = {
  sort: 'newest',
  replyFilter: 'ALL',
};

export function hasActivePublicReviewFilters(
  filters: PublicReviewListFilters,
): boolean {
  return (
    filters.sort !== 'newest' ||
    filters.replyFilter !== 'ALL' ||
    filters.overallRating != null
  );
}

export function publicReviewFiltersToQueryParams(
  filters: PublicReviewListFilters,
): Record<string, string | number | undefined> {
  return {
    sort: filters.sort,
    replyFilter: filters.replyFilter === 'ALL' ? undefined : filters.replyFilter,
    overallRating: filters.overallRating,
  };
}

export const PUBLIC_REVIEW_SORT_OPTIONS: {
  value: PublicReviewListSort;
  label: string;
}[] = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'highest', label: 'Mejor puntuadas' },
  { value: 'lowest', label: 'Menor puntuación' },
];

export const PUBLIC_REVIEW_REPLY_OPTIONS: {
  value: ProducerReviewReplyFilter;
  label: string;
}[] = [
  { value: 'ALL', label: 'Todas' },
  { value: 'ANSWERED', label: 'Con respuesta oficial' },
  { value: 'UNANSWERED', label: 'Sin respuesta oficial' },
];
