'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { adminGastroKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { AdminGastroDiscountStatusBadge } from '@/components/admin/gastro/AdminGastroDiscountStatusBadge';
import { AdminGastroDiscountPublicationEditor } from '@/components/admin/gastro/AdminGastroDiscountPublicationEditor';
import { AdminGastroDiscountQrPanel } from '@/components/admin/gastro/AdminGastroDiscountQrPanel';

export default function AdminGastroDiscountDetailPage() {
  const params = useParams();
  const profileId = (params?.profileId as string) ?? '';
  const discountId = (params?.discountId as string) ?? '';
  const router = useRouter();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [rejectReason, setRejectReason] = useState('');
  const [note, setNote] = useState('');

  const { data: item, isLoading, isError } = useQuery({
    queryKey: adminGastroKeys.discount(profileId, discountId),
    queryFn: () => repos.adminGastro.getDiscount(profileId, discountId),
    enabled: !!profileId && !!discountId,
  });

  useEffect(() => {
    if (item?.profileId && item.profileId !== profileId) {
      router.replace(`/admin/gastronomicos/${item.profileId}/descuentos/${discountId}`);
    }
  }, [item?.profileId, profileId, discountId, router]);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: adminGastroKeys.discount(profileId, discountId),
    });
    queryClient.invalidateQueries({ queryKey: adminGastroKeys.discounts(profileId) });
    queryClient.invalidateQueries({ queryKey: adminGastroKeys.detail(profileId) });
    queryClient.invalidateQueries({ queryKey: adminGastroKeys.all });
  };

  const markNegotiation = useMutation({
    mutationFn: () =>
      repos.adminGastro.markCommissionNegotiation(profileId, discountId, note || null),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: () => {
      addToast('Marcado en coordinación de comisión', 'success');
      invalidate();
    },
  });

  const approve = useMutation({
    mutationFn: () => repos.adminGastro.approve(profileId, discountId),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: () => {
      addToast('Ticket aprobado', 'success');
      invalidate();
    },
  });

  const reject = useMutation({
    mutationFn: () =>
      repos.adminGastro.reject(profileId, discountId, rejectReason, note || null),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: () => {
      addToast('Ticket rechazado', 'success');
      invalidate();
    },
  });

  const cancel = useMutation({
    mutationFn: () =>
      repos.adminGastro.cancel(profileId, discountId, rejectReason, note || null),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: () => {
      addToast('Ticket cancelado', 'success');
      invalidate();
    },
  });

  const sendQr = useMutation({
    mutationFn: () => repos.adminGastro.sendQrEmail(profileId, discountId),
    onError: (e) => addToast(getErrorMessage(e), 'error'),
    onSuccess: (updated) => {
      if (updated.emailSendError) {
        addToast(updated.emailSendError, 'error');
      } else {
        addToast('QR enviado por email', 'success');
      }
      invalidate();
    },
  });

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (isError || !item) {
    return (
      <PageContainer>
        <p className="text-text-muted">Ticket no encontrado</p>
        <Link
          href={`/admin/gastronomicos/${profileId}`}
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          ← Volver al local
        </Link>
      </PageContainer>
    );
  }

  const canonicalProfileId = item.profileId;
  const moderationPending = markNegotiation.isPending || approve.isPending || reject.isPending || cancel.isPending || sendQr.isPending;

  return (
    <PageContainer>
      <Link
        href={`/admin/gastronomicos/${canonicalProfileId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Volver al local
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <SectionTitle>{item.title ?? 'Ticket de descuento'}</SectionTitle>
        <AdminGastroDiscountStatusBadge status={item.status} />
      </div>

      <p className="mt-2 text-sm text-text-muted">
        Contacto: {item.ownerEmail ?? '—'} · {item.ownerPhone ?? '—'}
      </p>
      {item.discountDate && (
        <p className="text-sm text-text-muted">
          Fecha del descuento: {new Date(item.discountDate).toLocaleDateString('es-AR')}
        </p>
      )}

      {(item.summary || item.detail || item.submittedImageUrls.length > 0) && (
        <section className="mt-6 rounded-lg border border-border bg-bg-muted/50 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
            Contenido enviado por el local
          </h3>
          {item.summary && (
            <p className="mt-2 text-sm text-text">
              <span className="font-medium">Resumen: </span>
              {item.summary}
            </p>
          )}
          {item.detail && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">{item.detail}</p>
          )}
          {item.submittedImageUrls.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {item.submittedImageUrls.map((url, index) => (
                <li key={`submitted-preview-${index}`} className="aspect-square overflow-hidden rounded border border-border">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {item.emailSentAt && (
        <p className="mt-2 text-sm text-accent-soft">
          Email enviado: {new Date(item.emailSentAt).toLocaleString('es-AR')}
        </p>
      )}

      <AdminGastroDiscountQrPanel qrPayload={item.qrPayload} status={item.status} />

      <div className="mt-8">
        <AdminGastroDiscountPublicationEditor
          profileId={canonicalProfileId}
          discount={item}
          onSaved={invalidate}
        />
      </div>

      {!['REJECTED', 'CANCELLED', 'EXPIRED'].includes(item.status) && (
        <>
          <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            Coordiná la comisión con el local antes de aprobar. Guardá la publicación con al menos
            una imagen.
          </div>
          <Input
            label="Nota interna"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-4"
          />
          <Input
            label="Motivo (rechazo/cancelación)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-2"
          />
          <div className="mt-6 flex flex-wrap gap-2">
            {item.status === 'PENDING_REVIEW' && (
              <Button
                type="button"
                variant="secondary"
                disabled={moderationPending}
                onClick={() => {
                  if (window.confirm('¿Marcar en coordinación de comisión?')) markNegotiation.mutate();
                }}
              >
                Marcar en coordinación
              </Button>
            )}
            {['PENDING_REVIEW', 'COMMISSION_NEGOTIATION'].includes(item.status) && (
              <Button
                type="button"
                disabled={moderationPending}
                onClick={() => {
                  if (window.confirm('¿Aprobar este ticket?')) approve.mutate();
                }}
              >
                Aprobar
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              disabled={moderationPending || !rejectReason.trim()}
              onClick={() => {
                if (window.confirm('¿Rechazar este ticket?')) reject.mutate();
              }}
            >
              Rechazar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={moderationPending || !rejectReason.trim()}
              onClick={() => {
                if (window.confirm('¿Cancelar este ticket?')) cancel.mutate();
              }}
            >
              Cancelar
            </Button>
            {['APPROVED', 'ACTIVE'].includes(item.status) && (
              <Button
                type="button"
                disabled={moderationPending}
                onClick={() => {
                  if (window.confirm('¿Enviar QR por email al local?')) sendQr.mutate();
                }}
              >
                Enviar QR por mail
              </Button>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}
