'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProducerDetail } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import { PageContainer, Button, Input, useToast, SectionTitle } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';

function readLogoFile(e: React.ChangeEvent<HTMLInputElement>, onLogo: (url: string) => void) {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file?.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = () => onLogo(reader.result as string);
  reader.readAsDataURL(file);
}

function invalidateProducerProfile(
  queryClient: ReturnType<typeof useQueryClient>,
  profile: ProducerDetail,
) {
  queryClient.invalidateQueries({ queryKey: producersKeys.myProfile() });
  queryClient.invalidateQueries({ queryKey: producersKeys.detail(profile.id) });
  if (profile.slug?.trim()) {
    queryClient.invalidateQueries({ queryKey: producersKeys.detail(profile.slug.trim()) });
  }
}

export function ProducerIdentityForm({ profile }: { profile: ProducerDetail }) {
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [slug, setSlug] = useState(profile.slug ?? '');
  const [legalName, setLegalName] = useState(profile.legalName ?? '');
  const [shortDescription, setShortDescription] = useState(profile.shortDescription ?? '');
  const [longDescription, setLongDescription] = useState(profile.longDescription ?? '');
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl ?? '');

  useEffect(() => {
    setDisplayName(profile.displayName);
    setSlug(profile.slug ?? '');
    setLegalName(profile.legalName ?? '');
    setShortDescription(profile.shortDescription ?? '');
    setLongDescription(profile.longDescription ?? '');
    setLogoUrl(profile.logoUrl ?? '');
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () =>
      repos.producers.updateMyProfileIdentity({
        displayName: displayName.trim(),
        ...(slug.trim().length >= 2 ? { slug: slug.trim() } : {}),
        ...(legalName.trim() ? { legalName: legalName.trim() } : { legalName: undefined }),
        ...(shortDescription.trim()
          ? { shortDescription: shortDescription.trim() }
          : { shortDescription: undefined }),
        ...(longDescription.trim()
          ? { longDescription: longDescription.trim() }
          : { longDescription: undefined }),
        ...(logoUrl.trim() ? { logoUrl: logoUrl.trim() } : { logoUrl: null }),
      }),
    onSuccess: (updated) => {
      addToast('Identidad guardada', 'success');
      invalidateProducerProfile(queryClient, updated);
      router.push('/producer/profile');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  return (
    <PageContainer className="max-w-2xl">
      <Link href="/producer/profile" className="text-sm text-text-muted hover:text-accent">
        ← Volver al perfil
      </Link>
      <SectionTitle className="mt-4">Identidad</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">
        Logo, nombre, subtítulo y descripción pública de tu productora.
      </p>

      <form
        className="mt-8 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!displayName.trim()) {
            addToast('El nombre es obligatorio', 'error');
            return;
          }
          mutation.mutate();
        }}
      >
        <div>
          <p className="text-sm font-medium text-text">Logo</p>
          <div className="mt-3 flex flex-wrap items-start gap-4">
            {logoUrl.trim() ? (
              <div className="h-20 w-20 overflow-hidden rounded-full border border-border">
                <ImageUrlPreview
                  url={logoUrl}
                  className="mt-0 max-h-none h-full w-full rounded-none object-cover"
                />
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-border text-xs text-text-muted">
                Sin logo
              </div>
            )}
            <label className="cursor-pointer rounded-md border border-border px-3 py-2 text-sm hover:border-accent">
              Subir logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => readLogoFile(e, setLogoUrl)}
              />
            </label>
            {logoUrl.trim() ? (
              <button type="button" className="text-sm text-text-muted" onClick={() => setLogoUrl('')}>
                Quitar
              </button>
            ) : null}
          </div>
        </div>

        <Input label="Nombre / título" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <Input
          label="Identificador URL (slug)"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="ej. mi-productora"
        />
        <Input
          label="Razón social (opcional)"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
        />
        <Input
          label="Subtítulo"
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="Una línea sobre tu marca"
        />
        <div>
          <label className="text-sm font-medium text-text">Descripción</label>
          <textarea
            value={longDescription}
            onChange={(e) => setLongDescription(e.target.value)}
            rows={6}
            className="mt-1 w-full rounded-md border border-border bg-bg-muted px-3 py-2 text-text outline-none focus:border-accent-muted"
            placeholder="Contá sobre tu productora…"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/producer/profile')}>
            Cancelar
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}

export function ProducerIdentityFormLoader() {
  const repos = useRepositories();
  const router = useRouter();
  const { data: profile, isLoading } = useQuery({
    queryKey: producersKeys.myProfile(),
    queryFn: () => repos.producers.getMyProfile(),
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }
  if (!profile) {
    router.replace('/producer/profile');
    return null;
  }
  return <ProducerIdentityForm profile={profile} />;
}
