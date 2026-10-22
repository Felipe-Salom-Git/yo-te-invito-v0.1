'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { GastroLocalPreview } from '@/components/gastro/GastroLocalPreview';
import { GastroLocationsList } from '@/components/gastro/GastroLocationsList';
import { GastroLocationSelector } from '@/components/gastro/GastroLocationSelector';
import { GastroLocationStatusBadge } from '@/components/gastro/GastroLocationStatusBadge';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { gastroKeys } from '@/lib/query/keys';

export default function GastroLocalPage() {
  const repos = useRepositories();
  const { profileId, locations } = useGastroActiveLocation();

  const { data: local, isLoading } = useQuery({
    queryKey: gastroKeys.local(profileId),
    queryFn: () => repos.gastro.getMyLocal(profileId),
    enabled: !!profileId,
  });

  const subcategoryName =
    local?.subcategories?.find((s) => s.isPrimary)?.name ??
    local?.subcategories?.[0]?.name ??
    null;

  const showListOnly = locations.length > 1 && !profileId;

  if (isLoading && profileId) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <SectionTitle>Mis locales</SectionTitle>
      <div className="mb-6">
        <GastroLocationSelector />
      </div>

      <div className="mb-8">
        <GastroLocationsList />
      </div>

      {showListOnly ? null : !local && locations.length === 0 ? null : !local?.publicEventId ? (
        <div className="rounded-xl border border-border/80 bg-bg-muted/30 p-6">
          <p className="mb-2 font-medium text-text">
            {local?.displayName ?? 'Configurá tu local'}
          </p>
          {local?.status ? (
            <div className="mb-4">
              <GastroLocationStatusBadge status={local.status as 'PENDING'} />
            </div>
          ) : null}
          <p className="mb-4 text-sm text-text-muted">
            Configurá la ficha pública: nombre, ubicación, horarios, imágenes y contacto.
          </p>
          <Link
            href={
              local || profileId
                ? `/gastro/local/editar${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`
                : '/gastro/local/nuevo'
            }
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
          >
            {local ? 'Completar local' : 'Crear local'}
          </Link>
        </div>
      ) : local ? (
        <>
          <h2 className="mb-2 text-lg font-semibold text-text">Vista previa</h2>
          <p className="mb-4 text-sm text-text-muted">
            Así ven los usuarios tu ficha pública. Los descuentos se gestionan en la sección
            Descuentos.
          </p>
          <GastroLocalPreview local={local} subcategoryName={subcategoryName} />
        </>
      ) : null}
    </PageContainer>
  );
}
