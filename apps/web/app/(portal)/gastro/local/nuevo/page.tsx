'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, useToast } from '@/components';
import { GastroLocalForm } from '@/components/gastro/GastroLocalForm';
import { getErrorMessage } from '@/lib/errors';
import { gastroKeys } from '@/lib/query/keys';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import type { GastroLocal, GastroLocalUpsertPayload } from '@/repositories/interfaces';

const TENANT_ID = 'tenant-demo';

function buildPrefillFromLocal(local: GastroLocal): Partial<GastroLocal> {
  return {
    ...local,
    id: '',
    displayName: '',
    publicEventId: null,
    status: 'PENDING',
    bannerUrl: null,
    galleryUrls: null,
    summary: null,
    detail: null,
    subcategoryId: null,
    subcategories: [],
    tags: [],
  };
}

export default function GastroLocalNuevoPage() {
  const repos = useRepositories();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { locations } = useGastroActiveLocation();

  const copyFromParam = searchParams.get('copyFrom')?.trim() || '';
  const [copyFromId, setCopyFromId] = useState(copyFromParam);
  const [reuseLocation, setReuseLocation] = useState(!!copyFromParam);
  const [reuseContacts, setReuseContacts] = useState(!!copyFromParam);

  const { data: copySource } = useQuery({
    queryKey: gastroKeys.local(copyFromId || undefined),
    queryFn: () => repos.gastro.getMyLocal(copyFromId),
    enabled: !!copyFromId,
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', 'gastro', TENANT_ID],
    queryFn: () => repos.subcategories.listPublic(TENANT_ID, 'gastro'),
    staleTime: 5 * 60_000,
  });

  const formInitial = useMemo(() => {
    if (!copySource || (!reuseLocation && !reuseContacts)) return null;
    const base = buildPrefillFromLocal(copySource);
    if (!reuseLocation) {
      base.province = null;
      base.city = null;
      base.address = null;
      base.geoLat = null;
      base.geoLng = null;
      base.googlePlaceId = null;
    }
    if (!reuseContacts) {
      base.contactPhone = null;
      base.contactEmail = null;
      base.menuUrl = null;
      base.websiteUrl = null;
      base.bookingUrl = null;
      base.socialLinks = null;
      base.relatedLinks = null;
    }
    return base as GastroLocal;
  }, [copySource, reuseLocation, reuseContacts]);

  const saveMutation = useMutation({
    mutationFn: (payload: GastroLocalUpsertPayload) =>
      repos.gastro.createAdditionalLocal({
        ...payload,
        ...(copyFromId && (reuseLocation || reuseContacts)
          ? { copyFromProfileId: copyFromId }
          : {}),
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: gastroKeys.locations() });
      queryClient.invalidateQueries({ queryKey: gastroKeys.local() });
      addToast('Propuesta creada', 'success');
      router.push(`/gastro/local?profileId=${encodeURIComponent(created.id)}`);
    },
  });

  const copyOptions = locations.filter((l) => l.publicEventId);

  return (
    <PageContainer>
      <Link href="/gastro/local" className="mb-4 inline-block text-sm text-accent">
        ← Volver a mis locales
      </Link>
      <SectionTitle>Nuevo local / propuesta</SectionTitle>
      <p className="mb-6 text-sm text-text-muted">
        Podés cargar todo desde cero o reutilizar ubicación y contactos de un local existente. Los
        datos copiados quedan en esta propuesta y no modifican el original.
      </p>

      {copyOptions.length > 0 ? (
        <div className="mb-6 space-y-3 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
          <p className="text-sm font-medium text-text">Reutilizar datos existentes</p>
          <select
            value={copyFromId}
            onChange={(e) => setCopyFromId(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm"
          >
            <option value="">Empezar desde cero</option>
            {copyOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.displayName}
                {loc.city ? ` — ${loc.city}` : ''}
              </option>
            ))}
          </select>
          {copyFromId ? (
            <div className="flex flex-col gap-2 text-sm text-text">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reuseLocation}
                  onChange={(e) => setReuseLocation(e.target.checked)}
                />
                Copiar ubicación (dirección, provincia, localidad, mapa)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={reuseContacts}
                  onChange={(e) => setReuseContacts(e.target.checked)}
                />
                Copiar contactos (teléfono, email, links)
              </label>
            </div>
          ) : null}
        </div>
      ) : null}

      <GastroLocalForm
        key={`new-${copyFromId}-${reuseLocation}-${reuseContacts}`}
        initial={formInitial}
        subcategories={subcategories.map((s) => ({ id: s.id, name: s.name }))}
        submitting={saveMutation.isPending}
        submitLabel="Crear propuesta"
        onSubmit={(payload) => saveMutation.mutate(payload)}
      />
    </PageContainer>
  );
}
