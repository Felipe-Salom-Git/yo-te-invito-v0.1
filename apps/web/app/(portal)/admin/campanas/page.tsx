'use client';

import Link from 'next/link';
import { PageContainer, SectionTitle, Button, Badge, EmptyState } from '@/components';
import { useAdminCampaignsList } from '@/lib/query/admin-campaigns';
import {
  CAMPAIGN_AUDIENCE_LABEL,
  CAMPAIGN_CHANNEL_LABEL,
  CAMPAIGN_CONTENT_TYPE_LABEL,
  CAMPAIGN_STATUS_LABEL,
} from '@/lib/admin/campaign-labels';

export default function AdminCampanasPage() {
  const { data, isLoading, isError } = useAdminCampaignsList();

  return (
    <PageContainer>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <SectionTitle>Campañas</SectionTitle>
          <p className="mt-2 max-w-xl text-sm text-text-muted">
            Promoción por email a usuarios que aceptaron novedades. WhatsApp queda listo a nivel de
            dominio; el envío real requiere un proveedor configurado.
          </p>
        </div>
        <Link href="/admin/campanas/nueva">
          <Button>Nueva campaña</Button>
        </Link>
      </div>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : isError ? (
        <p className="mt-6 text-sm text-red-400">No se pudieron cargar las campañas.</p>
      ) : !data?.data.length ? (
        <EmptyState
          className="mt-8"
          title="Todavía no hay campañas"
          description="Creá un borrador, elegí contenido público y enviá solo a quienes dieron opt-in."
        />
      ) : (
        <ul className="mt-6 space-y-3">
          {data.data.map((row) => (
            <li key={row.id}>
              <Link
                href={`/admin/campanas/${row.id}`}
                className="block rounded-lg border border-border bg-bg-muted p-4 hover:border-accent"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text">{row.subject}</span>
                  <Badge>{CAMPAIGN_STATUS_LABEL[row.status] ?? row.status}</Badge>
                  <Badge>{CAMPAIGN_CHANNEL_LABEL[row.channel] ?? row.channel}</Badge>
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  {CAMPAIGN_CONTENT_TYPE_LABEL[row.contentType] ?? row.contentType} ·{' '}
                  {CAMPAIGN_AUDIENCE_LABEL[row.audienceKind] ?? row.audienceKind}
                  {row.status !== 'DRAFT'
                    ? ` · enviados ${row.sentCount} / cola ${row.queuedCount}`
                    : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
