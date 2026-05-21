'use client';

import Link from 'next/link';
import { PageContainer } from '@/components';
import { ManagedReviewsCommentsPage } from '@/components/reviews/ManagedReviewsCommentsPage';

export default function GastroValoracionesPage() {
  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <ManagedReviewsCommentsPage scope="gastro" />
    </PageContainer>
  );
}
