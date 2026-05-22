'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, QueryError } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { HotelProfilePreview } from '@/components/hotel/HotelProfilePreview';
import { HOTELS_PORTAL_V2_NOTE } from '@/lib/hotel/hotelsComingSoonCopy';
import {
  getHotelProfileCompleteness,
  hotelProfileStatusLabel,
} from '@/lib/hotel/hotel-profile-completeness';
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

  const completeness = getHotelProfileCompleteness(profile);

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

          <div className="mt-6 rounded-xl border border-border bg-bg-muted/40 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-text">Completitud de la ficha</h2>
              <span className="text-sm font-medium text-accent">{completeness.percent}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              {completeness.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2">
                  <span className={item.done ? 'text-text-muted line-through' : 'text-text'}>
                    {item.label}
                  </span>
                  {!item.done ? (
                    <Link href={item.editHref} className="shrink-0 text-accent hover:underline">
                      Completar
                    </Link>
                  ) : (
                    <span className="text-xs text-emerald-400/90">Listo</span>
                  )}
                </li>
              ))}
            </ul>
            <Link
              href="/hotel/editar"
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent-hover"
            >
              Editar ficha
            </Link>
          </div>

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
