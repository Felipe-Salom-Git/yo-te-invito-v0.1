import type {
  AdminReviewsReportProblematicReview,
  PublicReviewCategory,
} from '@yo-te-invito/shared';

export const ADMIN_REVIEW_CATEGORY_LABELS: Record<PublicReviewCategory, string> = {
  event: 'Eventos',
  gastro: 'Gastro',
  rental: 'Rentals',
  excursion: 'Excursiones',
  hotel: 'Hoteles',
};

export function adminReviewSignalLabel(
  signal: AdminReviewsReportProblematicReview['signal'],
): string {
  switch (signal) {
    case 'low_rating':
      return 'Puntuación baja';
    case 'open_dispute':
      return 'Disputa abierta';
    case 'recently_hidden':
      return 'Ocultada recientemente';
    default:
      return signal;
  }
}
