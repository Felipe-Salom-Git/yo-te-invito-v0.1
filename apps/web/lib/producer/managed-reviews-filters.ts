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

/** Gastro/hotel — sin disputas ni estado público. */
export const MANAGED_PORTAL_QUICK_FILTERS: { id: ManagedReviewsQuickFilter; label: string }[] =
  [
    { id: 'all', label: 'Todos' },
    { id: 'unanswered', label: 'Sin responder' },
    { id: 'answered', label: 'Respondidos' },
    { id: 'highest', label: 'Mejores' },
    { id: 'lowest', label: 'Menores' },
  ];

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
