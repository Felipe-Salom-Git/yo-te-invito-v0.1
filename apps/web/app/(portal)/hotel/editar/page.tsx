'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HotelProfileUpdateInput } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, PageLoader, QueryError, useToast } from '@/components';
import { HotelProfileForm } from '@/components/hotel/HotelProfileForm';
import { getErrorMessage } from '@/lib/errors';
import { hotelKeys } from '@/lib/query/keys';

export default function HotelEditarPage() {
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: hotelKeys.me(),
    queryFn: () => repos.hotel.getMe(),
  });

  const profile = data?.profile;

  const saveMutation = useMutation({
    mutationFn: (payload: HotelProfileUpdateInput) => repos.hotel.updateMe(payload),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: hotelKeys.me() });
      addToast('Ficha guardada', 'success');
      router.push('/hotel');
    },
  });

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando ficha…" />
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
        <SectionTitle>Sin perfil activo</SectionTitle>
        <p className="mt-4 text-text-muted">No podés editar la ficha sin un perfil hotel aprobado.</p>
        <Link href="/hotel" className="mt-4 inline-block text-sm text-accent hover:underline">
          Volver al portal
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/hotel" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Mi establecimiento
      </Link>
      <SectionTitle>Editar ficha</SectionTitle>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        Actualizá los datos de tu alojamiento. No hay reservas ni precios en Yo Te Invito; el enlace
        de reservas externo es opcional.
      </p>
      <div className="mt-8 max-w-3xl">
        <HotelProfileForm
          key={profile.updatedAt}
          initial={profile}
          submitting={saveMutation.isPending}
          onSubmit={(payload) => saveMutation.mutate(payload)}
        />
      </div>
    </PageContainer>
  );
}
