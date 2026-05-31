'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, useToast } from '@/components';
import { GastroLocalForm } from '@/components/gastro/GastroLocalForm';
import { getErrorMessage } from '@/lib/errors';
import { useMe } from '@/hooks/useMe';
import { gastroKeys } from '@/lib/query/keys';

const TENANT_ID = 'tenant-demo';

export default function GastroLocalEditarPage() {
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: local, isPending } = useQuery({
    queryKey: gastroKeys.local(),
    queryFn: () => repos.gastro.getMyLocal(),
    staleTime: 60_000,
  });

  const { user: me } = useMe();

  const gastroProfileId =
    local?.id ?? me?.availableProfiles?.gastro?.profiles?.[0]?.id;

  const { data: subcategories = [] } = useQuery({
    queryKey: ['subcategories', 'gastro', TENANT_ID],
    queryFn: () => repos.subcategories.listPublic(TENANT_ID, 'gastro'),
    staleTime: 5 * 60_000,
  });

  const isCreate = !local?.publicEventId;

  const saveMutation = useMutation({
    mutationFn: (payload: Parameters<typeof repos.gastro.createMyLocal>[0]) =>
      isCreate ? repos.gastro.createMyLocal(payload) : repos.gastro.updateMyLocal(payload),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gastroKeys.local() });
      addToast('Local guardado', 'success');
      router.push('/gastro/local');
    },
  });

  if (isPending) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/gastro/local" className="mb-4 inline-block text-sm text-accent">
        ← Volver
      </Link>
      <SectionTitle>{isCreate ? 'Crear local' : 'Editar local'}</SectionTitle>
      <GastroLocalForm
        key={local?.id ?? 'create-local'}
        initial={local}
        subcategories={subcategories.map((s) => ({ id: s.id, name: s.name }))}
        submitting={saveMutation.isPending}
        submitLabel={isCreate ? 'Guardar local' : 'Actualizar local'}
        gastroProfileId={gastroProfileId}
        onSubmit={(payload) => saveMutation.mutate(payload)}
      />
    </PageContainer>
  );
}
