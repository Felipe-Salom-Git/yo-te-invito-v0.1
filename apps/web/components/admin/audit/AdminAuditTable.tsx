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

type AdminAuditTableProps = {
  logs: AuditLogItem[];
};

export function AdminAuditTable({ logs }: AdminAuditTableProps) {
  if (logs.length === 0) return null;

  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-bg-muted/60 text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Acción</th>
            <th className="px-4 py-3 font-medium">Resumen</th>
            <th className="px-4 py-3 font-medium">Actor</th>
            <th className="px-4 py-3 font-medium">Entidad</th>
            <th className="px-4 py-3 font-medium">Detalle</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b border-border/50 align-top">
              <td className="whitespace-nowrap px-4 py-3 text-text-muted">
                {formatDt(log.createdAt)}
              </td>
              <td className="px-4 py-3">
                <AdminAuditActionBadge action={log.action} />
              </td>
              <td className="max-w-xs px-4 py-3 text-text">
                {log.summary ?? '—'}
              </td>
              <td className="px-4 py-3 text-text-muted">
                <p className="text-text">{log.actorDisplayName ?? '—'}</p>
                <p className="text-xs">{log.actorEmail ?? log.actorId}</p>
                <p className="text-[10px] uppercase tracking-wide">{log.actorRole}</p>
              </td>
              <td className="px-4 py-3 text-text-muted">
                <p>{log.entityType}</p>
                <p className="mt-0.5 font-mono text-[11px] break-all">{log.entityId}</p>
              </td>
              <td className="px-4 py-3">
                <AdminAuditMetadataPreview
                  before={log.before}
                  after={log.after}
                  metadata={log.metadata}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
