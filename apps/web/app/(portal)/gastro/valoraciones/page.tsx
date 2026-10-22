'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { EmptyState, PageContainer, PageLoader } from '@/components';
import { GastroLocationSelector } from '@/components/gastro/GastroLocationSelector';
import { ManagedReviewsCommentsPage } from '@/components/reviews/ManagedReviewsCommentsPage';
import { ManagedPortalReviewAlerts } from '@/components/reviews/ManagedPortalReviewAlerts';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';

export default function GastroValoracionesPage() {
  const { status } = useSession();
  const { activeLocation, isLoading, profileId } = useGastroActiveLocation();

  return (
    <PageContainer>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <div className="mb-6">
        <GastroLocationSelector />
      </div>
      <ManagedPortalReviewAlerts
        enabled={status === 'authenticated'}
        heading="Reseñas pendientes de atención"
        defaultHref="/gastro/valoraciones"
      />
      {isLoading ? (
        <PageLoader message="Cargando local…" />
      ) : !profileId ? (
        <EmptyState
          title="Sin locales"
          description="Creá un local para recibir valoraciones por establecimiento."
        />
      ) : !activeLocation?.publicEventId ? (
        <EmptyState
          title="Local sin ficha pública"
          description={`«${activeLocation?.displayName ?? 'Este local'}» aún no tiene evento público vinculado. Las valoraciones se asocian a la ficha pública de cada local.`}
        />
      ) : (
        <ManagedReviewsCommentsPage
          scope="gastro"
          scopedEventId={activeLocation.publicEventId}
          scopedEntityLabel={activeLocation.displayName}
        />
      )}
    </PageContainer>
  );
}
