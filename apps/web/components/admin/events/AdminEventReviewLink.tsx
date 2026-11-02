import Link from 'next/link';
import { Button } from '@/components';
import type { AdminEventListItem } from '@/repositories/interfaces';

type AdminEventReviewLinkProps = {
  event: AdminEventListItem;
  size?: 'sm' | 'md';
};

export function adminEventReviewHref(event: {
  producerProfileId: string | null;
  gastroProfileId?: string | null;
}): string {
  if (event.gastroProfileId) {
    // Gastro promo events are approved / rejected from the admin events list itself.
    return '/admin/eventos?view=pending&origin=gastro';
  }
  if (event.producerProfileId) {
    return `/admin/productoras/${event.producerProfileId}`;
  }
  return '/admin/productoras';
}

/** Routes to existing producer moderation flow (approve/reject in AdminProducerEventsTable). */
export function AdminEventReviewLink({ event, size = 'sm' }: AdminEventReviewLinkProps) {
  if (event.gastroProfileId) {
    return (
      <Link href={`/admin/gastronomicos/${event.gastroProfileId}`}>
        <Button size={size === 'sm' ? 'sm' : 'md'} variant="outline">
          Ver local
        </Button>
      </Link>
    );
  }
  return (
    <Link href={adminEventReviewHref(event)}>
      <Button size={size === 'sm' ? 'sm' : 'md'}>Revisar</Button>
    </Link>
  );
}
