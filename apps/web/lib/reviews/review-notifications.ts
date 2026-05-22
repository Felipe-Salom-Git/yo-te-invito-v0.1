import type { UserNotification } from '@yo-te-invito/shared';
import { REVIEW_NOTIFICATION_KINDS } from '@yo-te-invito/shared';

const REVIEW_KINDS = new Set<string>(REVIEW_NOTIFICATION_KINDS);

export function isReviewNotification(item: Pick<UserNotification, 'kind'>): boolean {
  return REVIEW_KINDS.has(item.kind);
}

export function filterReviewNotifications(items: UserNotification[]): UserNotification[] {
  return items.filter(isReviewNotification);
}

export function reviewNotificationLabel(kind: UserNotification['kind']): string {
  switch (kind) {
    case 'REVIEW_RECEIVED':
      return 'Nueva valoración';
    case 'REVIEW_OFFICIAL_REPLY':
      return 'Respuesta oficial';
    case 'REVIEW_DISPUTE_CREATED':
      return 'Disputa enviada';
    case 'REVIEW_DISPUTE_ACCEPTED':
      return 'Disputa aceptada';
    case 'REVIEW_DISPUTE_REJECTED':
      return 'Disputa rechazada';
    case 'REVIEW_MODERATION_HIDDEN':
      return 'Reseña ocultada';
    case 'REVIEW_MODERATION_RESTORED':
      return 'Reseña restaurada';
    default:
      return 'Valoraciones';
  }
}
