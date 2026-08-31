'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, useToast } from '@/components';
import { GastroDiscountForm } from '@/components/gastro/GastroDiscountForm';
import { adminGastroKeys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/errors';

export default function AdminGastroDiscountNuevoPage() {
  const params = useParams();
  const profileId = (params?.profileId as string) ?? '';
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: location } = useQuery({
    queryKey: adminGastroKeys.detail(profileId),
    queryFn: () => repos.adminGastro.getLocation(profileId),
    enabled: !!profileId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof repos.adminGastro.createDiscount>[1]) =>
      repos.adminGastro.createDiscount(profileId, payload),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (created) => {
      addToast('Descuento creado y activado', 'success');
      queryClient.invalidateQueries({ queryKey: adminGastroKeys.discounts(profileId) });
      queryClient.invalidateQueries({ queryKey: adminGastroKeys.detail(profileId) });
      router.push(`/admin/gastronomicos/${profileId}/descuentos/${created.id}`);
    },
  });

  return (
    <PageContainer>
      <Link
        href={`/admin/gastronomicos/${profileId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Volver al local
      </Link>
      <SectionTitle>Crear descuento para {location?.displayName ?? 'local'}</SectionTitle>
      <p className="mt-2 mb-6 text-sm text-text-muted">
        El descuento nace activo (sin auto-aprobación). Debe existir un local ACTIVE del tenant.
      </p>
      {location && location.status !== 'active' && (
        <p className="mb-4 text-sm text-red-300">Este local no está ACTIVE; no se puede crear un descuento público.</p>
      )}
      <GastroDiscountForm
        variant="admin"
        gastroProfileId={profileId}
        submitting={createMutation.isPending}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />
    </PageContainer>
  );
}
