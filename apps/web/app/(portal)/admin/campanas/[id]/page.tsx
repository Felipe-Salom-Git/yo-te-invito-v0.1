'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  PageContainer,
  SectionTitle,
  Button,
  Badge,
  Modal,
  useToast,
} from '@/components';
import {
  useAdminCampaign,
  useAdminCampaignDeliveries,
  useAdminCampaignPreview,
  useArchiveAdminCampaign,
  useCancelAdminCampaign,
  useDeleteAdminCampaignDraft,
  useSendAdminCampaign,
} from '@/lib/query/admin-campaigns';
import {
  CAMPAIGN_AUDIENCE_LABEL,
  CAMPAIGN_CHANNEL_LABEL,
  CAMPAIGN_CONTENT_TYPE_LABEL,
  CAMPAIGN_DELIVERY_STATUS_LABEL,
  CAMPAIGN_STATUS_LABEL,
} from '@/lib/admin/campaign-labels';
import { getErrorMessage } from '@/lib/errors';

export default function AdminCampanaDetallePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { addToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const campaign = useAdminCampaign(id);
  const preview = useAdminCampaignPreview(id, campaign.data?.status === 'DRAFT');
  const deliveries = useAdminCampaignDeliveries(id);
  const send = useSendAdminCampaign();
  const cancel = useCancelAdminCampaign();
  const archive = useArchiveAdminCampaign();
  const remove = useDeleteAdminCampaignDraft();

  const row = campaign.data;
  const eligible = preview.data?.eligibleCount ?? 0;

  const onSend = async () => {
    try {
      await send.mutateAsync(id);
      setConfirmOpen(false);
      addToast('Campaña en cola de envío', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  };

  if (campaign.isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }
  if (!row) {
    return (
      <PageContainer>
        <p className="text-text-muted">Campaña no encontrada.</p>
      </PageContainer>
    );
  }

  const whatsappBlocked = row.channel === 'WHATSAPP' && !row.whatsappConfigured;
  const canSend = row.status === 'DRAFT' && !whatsappBlocked;

  return (
    <PageContainer>
      <Link href="/admin/campanas" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Campañas
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle>{row.subject}</SectionTitle>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{CAMPAIGN_STATUS_LABEL[row.status] ?? row.status}</Badge>
            <Badge>{CAMPAIGN_CHANNEL_LABEL[row.channel] ?? row.channel}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {row.status === 'DRAFT' && (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await remove.mutateAsync(id);
                  router.push('/admin/campanas');
                } catch (err) {
                  addToast(getErrorMessage(err), 'error');
                }
              }}
            >
              Eliminar borrador
            </Button>
          )}
          {(row.status === 'DRAFT' || row.status === 'SENDING') && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await cancel.mutateAsync(id);
                  addToast(
                    row.status === 'SENDING'
                      ? 'Cancelación pedida: no se encolan más envíos. Los ya enviados no se retractan.'
                      : 'Campaña cancelada',
                    'success',
                  );
                } catch (err) {
                  addToast(getErrorMessage(err), 'error');
                }
              }}
            >
              Cancelar
            </Button>
          )}
          {['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'].includes(row.status) && !row.archivedAt && (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await archive.mutateAsync(id);
                  addToast('Campaña archivada', 'success');
                } catch (err) {
                  addToast(getErrorMessage(err), 'error');
                }
              }}
            >
              Archivar
            </Button>
          )}
          {canSend && (
            <Button onClick={() => setConfirmOpen(true)} disabled={preview.isLoading}>
              Enviar
            </Button>
          )}
        </div>
      </div>

      {whatsappBlocked && (
        <p className="mt-4 rounded border border-amber-700/50 bg-amber-950/30 p-3 text-sm text-amber-300">
          WhatsApp — proveedor no configurado. El envío real está bloqueado.
        </p>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-4 text-sm">
          <p>
            Contenido:{' '}
            {CAMPAIGN_CONTENT_TYPE_LABEL[row.contentType] ?? row.contentType}
          </p>
          <p className="mt-1">
            Recurso: {preview.data?.content.title ?? row.contentSnapshot?.title ?? row.contentId}
          </p>
          {(preview.data?.content.benefit || row.contentSnapshot?.benefit) && (
            <p className="mt-1">
              Beneficio: {preview.data?.content.benefit ?? row.contentSnapshot?.benefit}
            </p>
          )}
          <p className="mt-1">
            Audiencia: {CAMPAIGN_AUDIENCE_LABEL[row.audienceKind] ?? row.audienceKind}
          </p>
          {row.status === 'DRAFT' && preview.data && (
            <p className="mt-2 font-medium">
              Destinatarios elegibles estimados: {preview.data.eligibleCount}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border p-4 text-sm">
          <p className="font-medium">{row.headline}</p>
          <p className="mt-2 whitespace-pre-wrap text-text-muted">{row.body}</p>
          <p className="mt-2">Botón: {row.ctaLabel}</p>
          <p className="mt-3 text-xs text-text-muted">
            Métricas reales: cola {row.queuedCount} · enviados al SMTP {row.sentCount} · omitidos{' '}
            {row.skippedCount} · fallidos {row.failedCount}. No hay opens ni delivered.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold">Entregas (paginadas)</h2>
        {deliveries.isLoading ? (
          <p className="mt-2 text-sm text-text-muted">Cargando…</p>
        ) : !deliveries.data?.data.length ? (
          <p className="mt-2 text-sm text-text-muted">Todavía no hay entregas.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="text-text-muted">
                  <th className="py-1">Estado</th>
                  <th className="py-1">Destino</th>
                  <th className="py-1">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.data.data.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    <td className="py-2">{CAMPAIGN_DELIVERY_STATUS_LABEL[d.status] ?? d.status}</td>
                    <td className="py-2">{d.targetHint ?? '—'}</td>
                    <td className="py-2 text-text-muted">{d.skipReason ?? d.errorCode ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-text-muted">Total {deliveries.data.total}</p>
          </div>
        )}
      </section>

      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar envío"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Volver
            </Button>
            <Button onClick={onSend} disabled={send.isPending}>
              {send.isPending ? 'Enviando…' : `Enviar campaña a ${eligible} destinatarios elegibles`}
            </Button>
          </div>
        }
      >
        <p className="text-sm">
          Se reevaluará el consentimiento al enviar. Solo reciben el mail quienes siguen con opt-in
          de email, cuenta activa y correo verificado.
        </p>
      </Modal>
    </PageContainer>
  );
}
