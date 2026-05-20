import type { ReviewDisputeStatus } from '@/repositories/interfaces';
import { ReviewDisputeStatusBadge } from '@/components/producer/comments/ReviewDisputeStatusBadge';

export function AdminReviewDisputeStatusBadge({ status }: { status: ReviewDisputeStatus }) {
  return <ReviewDisputeStatusBadge status={status} />;
}
