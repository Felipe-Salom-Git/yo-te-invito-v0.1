'use client';

import type { AuditLogItem } from '@/repositories/interfaces';
import { AdminAuditActionBadge } from './AdminAuditActionBadge';
import { AdminAuditMetadataPreview } from './AdminAuditMetadataPreview';

function formatDt(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

type AdminAuditMobileCardProps = {
  log: AuditLogItem;
};

export function AdminAuditMobileCard({ log }: AdminAuditMobileCardProps) {
  return (
    <article className="rounded-xl border border-border/80 bg-bg-muted/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <time className="text-xs text-text-muted">{formatDt(log.createdAt)}</time>
        <AdminAuditActionBadge action={log.action} />
      </div>
      <p className="mt-2 text-sm text-text">{log.summary ?? log.action}</p>
      <dl className="mt-3 space-y-1 text-xs text-text-muted">
        <div>
          <dt className="inline font-medium">Actor: </dt>
          <dd className="inline">
            {log.actorDisplayName ?? log.actorEmail ?? log.actorId}
            {log.actorRole ? ` (${log.actorRole})` : ''}
          </dd>
        </div>
        <div>
          <dt className="inline font-medium">Entidad: </dt>
          <dd className="inline">
            {log.entityType} · <span className="font-mono text-[11px]">{log.entityId}</span>
          </dd>
        </div>
      </dl>
      <div className="mt-3">
        <AdminAuditMetadataPreview
          before={log.before}
          after={log.after}
          metadata={log.metadata}
        />
      </div>
    </article>
  );
}
