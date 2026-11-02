'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';
import { gastroKeys } from '@/lib/query/keys';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { GastroLocationSelector } from '@/components/gastro/GastroLocationSelector';
import { GastroPublicationsPanel } from '@/components/gastro/content/GastroPublicationsPanel';
import { GastroPromoEventsPanel } from '@/components/gastro/events/GastroPromoEventsPanel';
import {
  GASTRO_CONTENT_TAB,
  resolveGastroContentTab,
  type GastroContentTab,
} from '@/lib/gastro/gastroPromoEvents';

const TABS: Array<{ id: GastroContentTab; label: string }> = [
  { id: GASTRO_CONTENT_TAB.PUBLICATIONS, label: 'Publicaciones' },
  { id: GASTRO_CONTENT_TAB.EVENTS, label: 'Eventos' },
];

export default function GastroContenidoPage() {
  const repos = useRepositories();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profileId } = useGastroActiveLocation();
  const tab = resolveGastroContentTab(searchParams?.get('tab'));

  const { data: local, isLoading: localLoading } = useQuery({
    queryKey: gastroKeys.local(profileId),
    queryFn: () => repos.gastro.getMyLocal(profileId),
    enabled: !!profileId,
  });

  const effectiveProfileId = profileId ?? local?.id;

  const selectTab = (next: GastroContentTab) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next === GASTRO_CONTENT_TAB.PUBLICATIONS) params.delete('tab');
    else params.set('tab', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname ?? '/gastro/contenido', { scroll: false });
  };

  if (localLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  const header = (
    <>
      <Link href="/gastro" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Dashboard
      </Link>
      <SectionTitle>Contenido del local</SectionTitle>
      <div className="mt-4 max-w-md">
        <GastroLocationSelector />
      </div>
    </>
  );

  if (!effectiveProfileId) {
    return (
      <PageContainer>
        {header}
        <p className="mt-4 text-text-muted">
          Seleccioná un local o configurá uno en{' '}
          <Link href="/gastro/local" className="text-accent hover:underline">
            Mi local
          </Link>
          .
        </p>
      </PageContainer>
    );
  }

  if (!local?.publicEventId) {
    return (
      <PageContainer>
        {header}
        <p className="mt-4 text-text-muted">
          Completá la ficha del local para habilitar la ficha pública, las publicaciones y los eventos.
        </p>
        <Link
          href={`/gastro/local/editar${profileId ? `?profileId=${encodeURIComponent(profileId)}` : ''}`}
          className="mt-3 inline-block text-sm text-accent hover:underline"
        >
          Editar local →
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {header}
      <p className="mt-2 text-text-muted">
        Contenido público de <span className="font-medium text-text">{local.displayName}</span>.
      </p>
      <Link
        href={`/gastronomicos/${local.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-block text-sm text-accent hover:underline"
      >
        Ver ficha pública →
      </Link>

      <div role="tablist" aria-label="Tipo de contenido" className="mt-6 flex gap-2 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => selectTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-accent text-text'
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="mt-6">
        {tab === GASTRO_CONTENT_TAB.EVENTS ? (
          <GastroPromoEventsPanel
            local={{
              id: local.id,
              displayName: local.displayName,
              address: local.address ?? null,
              status: local.status,
            }}
          />
        ) : (
          <>
            <p className="mb-4 text-sm text-text-muted">
              Solo el estado <span className="text-text">Publicado</span> aparece en la ficha pública.
            </p>
            <GastroPublicationsPanel local={local} effectiveProfileId={effectiveProfileId} />
          </>
        )}
      </div>
    </PageContainer>
  );
}
