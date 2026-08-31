'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, useToast } from '@/components';
import { GastroDiscountForm } from '@/components/gastro/GastroDiscountForm';
import { GastroLocationSelector } from '@/components/gastro/GastroLocationSelector';
import { getErrorMessage } from '@/lib/errors';
import { useGastroActiveLocation } from '@/lib/gastro/GastroActiveLocationContext';
import { gastroKeys } from '@/lib/query/keys';

function profileQuery(profileId?: string) {
  return profileId ? `?profileId=${encodeURIComponent(profileId)}` : '';
}

export default function GastroDescuentoNuevoPage() {
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { profileId, locations } = useGastroActiveLocation();

  const operationalLocations = locations.filter((l) => l.status === 'ACTIVE');
  const needsProfilePick = operationalLocations.length > 1;

  const { data: local } = useQuery({
    queryKey: gastroKeys.local(profileId),
    queryFn: () => repos.gastro.getMyLocal(profileId),
    staleTime: 60_000,
    enabled: !!profileId,
  });

  const gastroProfileId = profileId ?? local?.id;

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof repos.gastro.createMyDiscount>[0]) =>
      repos.gastro.createMyDiscount(payload, gastroProfileId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gastroKeys.discounts(gastroProfileId) });
      addToast(
        'Tu ticket de descuento fue enviado a revisión. Administración se comunicará con vos para coordinar la comisión.',
        'success',
      );
      router.push(`/gastro/descuentos${profileQuery(gastroProfileId)}`);
    },
  });

  return (
    <PageContainer>
      <Link
        href={`/gastro/descuentos${profileQuery(gastroProfileId)}`}
        className="mb-4 inline-block text-sm text-accent"
      >
        ← Volver
      </Link>
      <SectionTitle>Nuevo ticket de descuento</SectionTitle>
      {needsProfilePick ? (
        <div className="mb-6 max-w-md">
          <GastroLocationSelector />
          {!gastroProfileId ? (
            <p className="mt-2 text-sm text-amber-200">
              Seleccioná el local para el que querés crear este descuento.
            </p>
          ) : null}
        </div>
      ) : null}
      <GastroDiscountForm
        gastroProfileId={gastroProfileId}
        submitting={createMutation.isPending}
        onSubmit={(payload) => {
          if (needsProfilePick && !gastroProfileId) {
            addToast('Seleccioná el local para este descuento.', 'error');
            return;
          }
          createMutation.mutate(payload);
        }}
      />
    </PageContainer>
  );
}
