'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, QueryError } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { HotelProfilePreview } from '@/components/hotel/HotelProfilePreview';
import { HotelOnboardingChecklist } from '@/components/onboarding/HotelOnboardingChecklist';
import { HOTELS_PORTAL_V2_NOTE } from '@/lib/hotel/hotelsComingSoonCopy';
import { hotelProfileStatusLabel } from '@/lib/hotel/hotel-profile-completeness';
import { hotelKeys } from '@/lib/query/keys';

export default function HotelPortalPage() {
  const repos = useRepositories();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: hotelKeys.me(),
    queryFn: () => repos.hotel.getMe(),
  });

  const profile = data?.profile;

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer>
        <QueryError message={getErrorMessage(error)} onRetry={() => void refetch()} />
      </PageContainer>
    );
  }

  if (!profile) {
    return (
      <PageContainer>
        <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Volver
        </Link>
        <SectionTitle>Portal hotel</SectionTitle>
        <p className="mt-4 text-text-muted">
          No encontramos un perfil hotel activo. Si acabás de ser aprobado, actualizá la página o
          contactá soporte.
        </p>
        <Link
          href="/cuenta/solicitar-hotel"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          Solicitar perfil hotel
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <SectionTitle>{profile.displayName}</SectionTitle>
          <p className="mt-2 text-sm text-text-muted">
            Estado: <span className="font-medium text-text">{hotelProfileStatusLabel(profile.status)}</span>
            {profile.starCategory != null ? ` · ${profile.starCategory}★` : ''}
          </p>
          <p className="mt-4 max-w-2xl text-sm text-text-muted">{HOTELS_PORTAL_V2_NOTE}</p>

          <HotelOnboardingChecklist profile={profile} className="mt-6" />

          <p className="mt-6 text-sm text-text-muted">
            Valoraciones de huéspedes en{' '}
            <Link href="/hotel/valoraciones" className="text-accent hover:underline">
              Valoraciones
            </Link>
            .
          </p>
        </div>

        <div className="w-full lg:max-w-sm lg:sticky lg:top-6">
          <h2 className="mb-3 text-sm font-semibold text-text-muted">Vista previa</h2>
          <HotelProfilePreview profile={profile} />
        </div>
      </div>
    </PageContainer>
  );
}
