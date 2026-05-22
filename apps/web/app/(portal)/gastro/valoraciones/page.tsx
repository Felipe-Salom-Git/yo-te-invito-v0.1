'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PageContainer } from '@/components';
import { ManagedReviewsCommentsPage } from '@/components/reviews/ManagedReviewsCommentsPage';
import { ManagedPortalReviewAlerts } from '@/components/reviews/ManagedPortalReviewAlerts';

export default function GastroValoracionesPage() {
  const { status } = useSession();

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <ManagedPortalReviewAlerts
        enabled={status === 'authenticated'}
        heading="Reseñas pendientes de atención"
        defaultHref="/gastro/valoraciones"
      />
      <ManagedReviewsCommentsPage scope="gastro" />
    </PageContainer>
  );
}
