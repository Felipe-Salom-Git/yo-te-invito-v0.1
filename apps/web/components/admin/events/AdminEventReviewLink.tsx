import Link from 'next/link';
import { Button } from '@/components';
import type { AdminEventListItem } from '@/repositories/interfaces';

type AdminEventReviewLinkProps = {
  event: AdminEventListItem;
  size?: 'sm' | 'md';
};

export function adminEventReviewHref(event: {
  producerProfileId: string | null;
}): string {
  if (event.producerProfileId) {
    return `/admin/productoras/${event.producerProfileId}`;
  }
  return '/admin/productoras';
}

/** Routes to existing producer moderation flow (approve/reject in AdminProducerEventsTable). */
export function AdminEventReviewLink({ event, size = 'sm' }: AdminEventReviewLinkProps) {
  return (
    <Link href={adminEventReviewHref(event)}>
      <Button size={size === 'sm' ? 'sm' : 'md'}>Revisar</Button>
    </Link>
  );
}
