'use client';

import Link from 'next/link';
import { PageContainer } from '@/components';
import { ManagedReviewsCommentsPage } from '@/components/reviews/ManagedReviewsCommentsPage';

export default function HotelValoracionesPage() {
  return (
    <PageContainer>
      <Link href="/hotel" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Mi establecimiento
      </Link>
      <ManagedReviewsCommentsPage scope="hotel" />
    </PageContainer>
  );
}
