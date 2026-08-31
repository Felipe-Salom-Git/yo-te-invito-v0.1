'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { excursionOperatorsKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  AdminActivityCouponForm,
  activityCouponFormToCreateInput,
  emptyActivityCouponForm,
} from '@/components/admin/activity-coupons/AdminActivityCouponForm';

export default function AdminActivityCouponNuevoPage() {
  const params = useParams();
  const router = useRouter();
  const operatorId = (params?.operatorId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();
  const [form, setForm] = useState(emptyActivityCouponForm());

  const { data: operator } = useQuery({
    queryKey: excursionOperatorsKeys.adminDetail(operatorId),
    queryFn: () => repos.excursionOperators.getAdmin(operatorId),
    enabled: !!operatorId,
  });

  const events = (operator?.excursions ?? []).map((e) => ({ id: e.id, title: e.title }));

  const createMutation = useMutation({
    mutationFn: () =>
      repos.activityCoupons.createAdmin(operatorId, activityCouponFormToCreateInput(form)),
    onSuccess: (created) => {
      addToast('Cupón creado', 'success');
      router.push(`/admin/excursiones/operadores/${operatorId}/cupones/${created.id}`);
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  return (
    <PageContainer>
      <Link
        href={`/admin/excursiones/operadores/${operatorId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Operador
      </Link>
      <SectionTitle>Nuevo cupón</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">
        Copy público: Actividades. El cupón queda publicado (ACTIVE) porque Admin es el operador V1.
      </p>
      {events.length === 0 ? (
        <p className="mt-6 text-text-muted">Creá una actividad antes de emitir un cupón.</p>
      ) : (
        <AdminActivityCouponForm
          events={events}
          value={form}
          onChange={setForm}
          onSubmit={() => createMutation.mutate()}
          submitting={createMutation.isPending}
          submitLabel="Crear cupón"
        />
      )}
    </PageContainer>
  );
}
