'use client';

import { PageContainer } from '@/components';
import { ManagedReviewsCommentsPage } from '@/components/reviews/ManagedReviewsCommentsPage';

export function ProducerCommentsPage() {
  return (
    <PageContainer>
      <ManagedReviewsCommentsPage scope="producer" />
    </PageContainer>
  );
}
