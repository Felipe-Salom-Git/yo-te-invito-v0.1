'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProducerDetail } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import { PageContainer, Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { RentalProductImagesForm } from '@/components/rentals/RentalProductImagesForm';
import type { GcsImageUploadConfig } from '@/lib/upload/gcs-image-upload-config';
import { normalizeGalleryForSave, parseGalleryUrls } from './utils';
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

export function ProducerImagesForm({ profile }: { profile: ProducerDetail }) {
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [coverImageUrl, setCoverImageUrl] = useState(profile.coverImageUrl ?? '');
  const [galleryUrls, setGalleryUrls] = useState<string[]>(parseGalleryUrls(profile));
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const uploadConfig: GcsImageUploadConfig = {
    scope: 'producer',
    entityId: profile.id,
  };

  useEffect(() => {
    setCoverImageUrl(profile.coverImageUrl ?? '');
    setGalleryUrls(parseGalleryUrls(profile));
  }, [profile]);

  const mutation = useMutation({
    mutationFn: () => {
      const cleaned = normalizeGalleryForSave(coverImageUrl, galleryUrls);
      return repos.producers.updateMyProfileImages({
        coverImageUrl: coverImageUrl.trim() || null,
        galleryUrls: cleaned,
      });
    },
    onSuccess: (updated) => {
      addToast('Imágenes guardadas', 'success');
      invalidateProducerProfile(queryClient, updated);
      router.push('/producer/profile');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  return (
    <PageContainer className="max-w-2xl">
      <ProducerProfileFormIntro
        blockTitle="Imágenes"
        description="Cabecera y galería de tu ficha pública. El logo se edita en Identidad. La cabecera no se repite en la galería al guardar."
      />

      <div className="mt-6 overflow-hidden">
        <RentalProductImagesForm
          value={{ headerImageUrl: coverImageUrl, galleryImageUrls: galleryUrls }}
          onChange={({ headerImageUrl, galleryImageUrls }) => {
            setCoverImageUrl(headerImageUrl);
            setGalleryUrls(normalizeGalleryForSave(headerImageUrl, galleryImageUrls));
          }}
          uploadConfig={uploadConfig}
          onUploadingChange={setIsUploadingImages}
        />
      </div>

      <div className="mt-8 flex gap-3">
        <Button
          type="button"
          disabled={mutation.isPending || isUploadingImages}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push('/producer/profile')}>
          Cancelar
        </Button>
      </div>
    </PageContainer>
  );
}

export function ProducerImagesFormLoader() {
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
  return <ProducerImagesForm profile={profile} />;
}
