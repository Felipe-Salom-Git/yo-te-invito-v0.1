import type {
  ProducerReviewDisputeFilter,
  ProducerReviewReplyFilter,
  ReviewPublicStatus,
} from '@yo-te-invito/shared';

export type ManagedReviewsQuickFilter =
  | 'all'
  | 'unanswered'
  | 'answered'
  | 'open_dispute'
  | 'highest'
  | 'lowest';

export function quickFilterToListParams(
  quick: ManagedReviewsQuickFilter,
): {
  replyFilter?: ProducerReviewReplyFilter;
  disputeStatus?: ProducerReviewDisputeFilter;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
} {
  switch (quick) {
    case 'unanswered':
      return { replyFilter: 'UNANSWERED' };
    case 'answered':
      return { replyFilter: 'ANSWERED' };
    case 'open_dispute':
      return { disputeStatus: 'OPEN' };
    case 'highest':
      return { sort: 'highest' };
    case 'lowest':
      return { sort: 'lowest' };
    default:
      return {};
  }
}

export const PUBLIC_STATUS_FILTER_OPTIONS: {
  value: '' | ReviewPublicStatus;
  label: string;
}[] = [
  { value: '', label: 'Cualquier estado' },
  { value: 'VISIBLE', label: 'Visible' },
  { value: 'IN_REVIEW', label: 'En revisión' },
  { value: 'HIDDEN', label: 'Oculta' },
  { value: 'REPORT_REJECTED', label: 'Reporte rechazado' },
  { value: 'DELETED_BY_USER', label: 'Eliminada por usuario' },
];
