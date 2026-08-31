'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { activityCouponsKeys, excursionOperatorsKeys } from '@/lib/query/keys';
import { Button, PageContainer, SectionTitle, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  AdminActivityCouponForm,
  activityCouponFormToCreateInput,
  activityCouponToForm,
} from '@/components/admin/activity-coupons/AdminActivityCouponForm';

export default function AdminActivityCouponDetailPage() {
  const params = useParams();
  const router = useRouter();
  const operatorId = (params?.operatorId as string) ?? '';
  const couponId = (params?.couponId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');

  const { data: coupon, isLoading } = useQuery({
    queryKey: activityCouponsKeys.adminDetail(operatorId, couponId),
    queryFn: () => repos.activityCoupons.getAdmin(operatorId, couponId),
    enabled: !!operatorId && !!couponId,
  });

  const { data: operator } = useQuery({
    queryKey: excursionOperatorsKeys.adminDetail(operatorId),
    queryFn: () => repos.excursionOperators.getAdmin(operatorId),
    enabled: !!operatorId,
  });

  const [form, setForm] = useState<ReturnType<typeof activityCouponToForm> | null>(null);

  const { data: metrics } = useQuery({
    queryKey: [...activityCouponsKeys.adminDetail(operatorId, couponId), 'metrics'],
    queryFn: () => repos.activityCoupons.getMetrics(operatorId, couponId),
    enabled: !!operatorId && !!couponId,
  });
  const formValue = form ?? (coupon ? activityCouponToForm(coupon) : null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: activityCouponsKeys.adminDetail(operatorId, couponId) });
    void qc.invalidateQueries({ queryKey: activityCouponsKeys.adminList(operatorId) });
  };

  const updateMutation = useMutation({
    mutationFn: () => {
      if (!formValue) throw new Error('Sin formulario');
      const body = activityCouponFormToCreateInput(formValue);
      const { eventId: _eventId, ...patch } = body;
      return repos.activityCoupons.updateAdmin(operatorId, couponId, patch);
    },
    onSuccess: () => {
      addToast('Cupón actualizado', 'success');
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const statusMutation = useMutation({
    mutationFn: (status: 'ACTIVE' | 'CANCELLED') =>
      repos.activityCoupons.patchStatusAdmin(operatorId, couponId, status),
    onSuccess: () => {
      addToast('Estado actualizado', 'success');
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const archiveMutation = useMutation({
    mutationFn: () => repos.activityCoupons.archiveAdmin(operatorId, couponId),
    onSuccess: () => {
      addToast('Cupón archivado', 'success');
      invalidate();
      router.push(`/admin/excursiones/operadores/${operatorId}`);
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const approveMutation = useMutation({
    mutationFn: () => repos.activityCoupons.approveAdmin(operatorId, couponId),
    onSuccess: () => {
      addToast('Cupón aprobado', 'success');
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: () => repos.activityCoupons.rejectAdmin(operatorId, couponId, rejectReason),
    onSuccess: () => {
      addToast('Cupón rechazado', 'success');
      invalidate();
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const events = (operator?.excursions ?? []).map((e) => ({ id: e.id, title: e.title }));

  return (
    <PageContainer>
      <Link
        href={`/admin/excursiones/operadores/${operatorId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Operador
      </Link>
      {isLoading || !coupon || !formValue ? (
        <p className="text-text-muted">Cargando…</p>
      ) : (
        <>
          <SectionTitle>{coupon.title}</SectionTitle>
          <p className="mt-2 text-sm text-text-muted">
            {coupon.benefitLabel} · {coupon.status}
            {coupon.archivedAt ? ' · archivado' : ''}
          </p>
          {metrics ? (
            <p className="mt-2 text-sm text-text-muted">
              Claims {metrics.claimsIssued} · usados {metrics.claimsUsed} · sin usar{' '}
              {metrics.claimsUnused} · validaciones {metrics.validations} · uso {metrics.useRate}%
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {coupon.status === 'PENDING_REVIEW' ? (
              <>
                <Button type="button" onClick={() => approveMutation.mutate()}>
                  Aprobar
                </Button>
                <input
                  className="rounded border border-border bg-bg px-2 py-1 text-sm"
                  placeholder="Motivo rechazo"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={() => rejectMutation.mutate()}>
                  Rechazar
                </Button>
              </>
            ) : null}
            {coupon.status === 'ACTIVE' || coupon.status === 'APPROVED' ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => statusMutation.mutate('CANCELLED')}
              >
                Cancelar
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={() => archiveMutation.mutate()}>
              Archivar
            </Button>
          </div>
          <AdminActivityCouponForm
            events={events}
            value={formValue}
            onChange={setForm}
            onSubmit={() => updateMutation.mutate()}
            submitting={updateMutation.isPending}
            submitLabel="Guardar cambios"
            lockEvent
          />
        </>
      )}
    </PageContainer>
  );
}
