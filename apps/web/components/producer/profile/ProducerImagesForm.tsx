'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProducerDetail } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { producersKeys } from '@/lib/query/keys';
import { PageContainer, Button, useToast, SectionTitle } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { RentalProductImagesForm } from '@/components/rentals/RentalProductImagesForm';
import { normalizeGalleryForSave, parseGalleryUrls } from './utils';

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
      <Link href="/producer/profile" className="text-sm text-text-muted hover:text-accent">
        ← Volver al perfil
      </Link>
      <SectionTitle className="mt-4">Galería e imágenes</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">Cabecera y galería (sin incluir la cabecera duplicada en la galería).</p>

      <div className="mt-8">
        <RentalProductImagesForm
          value={{ headerImageUrl: coverImageUrl, galleryImageUrls: galleryUrls }}
          onChange={({ headerImageUrl, galleryImageUrls }) => {
            setCoverImageUrl(headerImageUrl);
            setGalleryUrls(normalizeGalleryForSave(headerImageUrl, galleryImageUrls));
          }}
        />
      </div>

      <div className="mt-8 flex gap-3">
        <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
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
