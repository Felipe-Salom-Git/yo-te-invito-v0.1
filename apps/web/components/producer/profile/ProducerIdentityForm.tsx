'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProducerDetail } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import Link from 'next/link';
import { PageContainer, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { getProducerPublicPath } from '@/lib/producer/public-path';
import { ImageUrlPreview } from '@/components/admin/ImageUrlPreview';
import {
  IMAGE_ACCEPT_GCS,
  type GcsImageUploadConfig,
} from '@/lib/upload/gcs-image-upload-config';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';
import { ProducerProfileFormIntro } from './ProducerProfileFormIntro';

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
  const [legalName, setLegalName] = useState(profile.legalName ?? '');
  const [shortDescription, setShortDescription] = useState(profile.shortDescription ?? '');
  const [longDescription, setLongDescription] = useState(profile.longDescription ?? '');
  const [logoUrl, setLogoUrl] = useState(profile.logoUrl ?? '');

  const logoUploadConfig: GcsImageUploadConfig = {
    scope: 'producer',
    entityId: profile.id,
  };
  const { isUploading, uploadProgress, uploadSingleWithProgress } =
    useGcsImageUpload(logoUploadConfig);

  const handleLogoFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      const url = await uploadSingleWithProgress(file, 'logo');
      if (url) setLogoUrl(url);
    },
    [uploadSingleWithProgress],
  );

  useEffect(() => {
    setDisplayName(profile.displayName);
    setLegalName(profile.legalName ?? '');
    setShortDescription(profile.shortDescription ?? '');
    setLongDescription(profile.longDescription ?? '');
    setLogoUrl(profile.logoUrl ?? '');
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () =>
      repos.producers.updateMyProfileIdentity({
        displayName: displayName.trim(),
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
      <ProducerProfileFormIntro
        blockTitle="Identidad"
        description="Nombre, logo y textos de tu ficha pública. La URL se genera automáticamente desde el nombre (única en la plataforma). La razón social no se muestra en la vista pública."
      />

      <form
        className="mt-6 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (isUploading) return;
          if (!displayName.trim()) {
            addToast('El nombre es obligatorio', 'error');
            return;
          }
          mutation.mutate();
        }}
      >
        <div>
          <p className="text-sm font-medium text-text">Logo</p>
          <p className="mt-1 text-xs text-text-muted">
            Recomendado cuadrado, visible en listados y ficha (JPEG, PNG o WEBP, máx. 5 MB).
          </p>
          {uploadProgress ? (
            <p className="mt-2 text-sm text-accent" role="status">
              {uploadProgress}
            </p>
          ) : null}
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
                accept={IMAGE_ACCEPT_GCS}
                className="hidden"
                disabled={isUploading}
                onChange={handleLogoFile}
              />
            </label>
            {logoUrl.trim() ? (
              <button type="button" className="text-sm text-text-muted" onClick={() => setLogoUrl('')}>
                Quitar
              </button>
            ) : null}
          </div>
        </div>

        <Input
          label="Nombre / título"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
        {profile.slug?.trim() ? (
          <div className="rounded-lg border border-border/80 bg-bg-muted/40 px-3 py-2 text-sm">
            <p className="text-xs text-text-muted">URL pública de tu ficha</p>
            <p className="mt-1 font-mono text-text">{getProducerPublicPath(profile)}</p>
            <Link
              href={getProducerPublicPath(profile)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-accent hover:underline"
            >
              Ver ficha pública →
            </Link>
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            Al guardar, se creará automáticamente la URL pública a partir del nombre.
          </p>
        )}
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
          <Button type="submit" disabled={mutation.isPending || isUploading}>
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
