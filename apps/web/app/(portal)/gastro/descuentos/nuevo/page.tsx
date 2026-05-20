'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, useToast } from '@/components';
import { GastroDiscountForm } from '@/components/gastro/GastroDiscountForm';
import { getErrorMessage } from '@/lib/errors';
import { gastroKeys } from '@/lib/query/keys';

export default function GastroDescuentoNuevoPage() {
  const repos = useRepositories();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const createMutation = useMutation({
    mutationFn: repos.gastro.createMyDiscount,
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gastroKeys.discounts() });
      addToast(
        'Tu ticket de descuento fue enviado a revisión. Administración se comunicará con vos para coordinar la comisión.',
        'success',
      );
      router.push('/gastro/descuentos');
    },
  });

  return (
    <PageContainer>
      <Link href="/gastro/descuentos" className="mb-4 inline-block text-sm text-accent">
        ← Volver
      </Link>
      <SectionTitle>Nuevo ticket de descuento</SectionTitle>
      <GastroDiscountForm
        submitting={createMutation.isPending}
        onSubmit={(payload) => createMutation.mutate(payload)}
      />
    </PageContainer>
  );
}
