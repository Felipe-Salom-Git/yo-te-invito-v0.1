import type { UserNotification } from '@yo-te-invito/shared';
import { PRODUCER_EVENT_STATUS_NOTIFICATION_KINDS } from '@yo-te-invito/shared';

const PRODUCER_STATUS_KINDS = new Set<string>(PRODUCER_EVENT_STATUS_NOTIFICATION_KINDS);

export function isProducerEventStatusNotification(
  item: Pick<UserNotification, 'kind'>,
): boolean {
  return PRODUCER_STATUS_KINDS.has(item.kind);
}

export function filterProducerEventStatusNotifications(
  items: UserNotification[],
): UserNotification[] {
  return items.filter(isProducerEventStatusNotification);
}

export function producerEventStatusLabel(kind: UserNotification['kind']): string {
  if (kind === 'EVENT_APPROVED_BY_ADMIN') return 'Aprobado';
  if (kind === 'EVENT_REJECTED_BY_ADMIN') return 'Rechazado';
  return 'Actualización';
}
