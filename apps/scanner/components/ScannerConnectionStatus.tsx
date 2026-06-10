'use client';

import type { SnapshotMeta } from '@/lib/db/offline-scanner';
import { isSnapshotStale } from '@/lib/db/offline-scanner';

type Props = {
  isOnline: boolean;
  snapshotMeta: SnapshotMeta | null;
  pendingCount: number;
  conflictCount: number;
  syncing: boolean;
  lastSummary: { synced: number; conflicts: number; errors: number } | null;
};

function pillClass(tone: 'ok' | 'warn' | 'error' | 'muted' | 'info'): string {
  if (tone === 'ok') return 'bg-emerald-600/90 text-white';
  if (tone === 'warn') return 'bg-amber-600/90 text-white';
  if (tone === 'error') return 'bg-red-600/90 text-white';
  if (tone === 'info') return 'bg-sky-600/90 text-white';
  return 'bg-slate-600/90 text-slate-100';
}

export function ScannerConnectionStatus({
  isOnline,
  snapshotMeta,
  pendingCount,
  conflictCount,
  syncing,
  lastSummary,
}: Props) {
  const stale = snapshotMeta ? isSnapshotStale(snapshotMeta) : false;

  return (
    <section className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 font-medium ${pillClass(isOnline ? 'ok' : 'warn')}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
        {!snapshotMeta && (
          <span className={`rounded-full px-3 py-1 ${pillClass('muted')}`}>Sin listado offline</span>
        )}
        {snapshotMeta && (
          <span className={`rounded-full px-3 py-1 ${pillClass(stale ? 'warn' : 'ok')}`}>
            {stale ? 'Listado desactualizado' : 'Listado guardado'}
          </span>
        )}
        {pendingCount > 0 && (
          <span className={`rounded-full px-3 py-1 ${pillClass('warn')}`}>
            {pendingCount} pendiente{pendingCount === 1 ? '' : 's'} de sincronizar
          </span>
        )}
        {syncing && (
          <span className={`rounded-full px-3 py-1 ${pillClass('info')}`}>Sincronizando…</span>
        )}
        {conflictCount > 0 && (
          <span className={`rounded-full px-3 py-1 ${pillClass('error')}`}>
            {conflictCount} conflicto{conflictCount === 1 ? '' : 's'}
          </span>
        )}
        {lastSummary && pendingCount === 0 && conflictCount === 0 && isOnline && (
          <span className={`rounded-full px-3 py-1 ${pillClass('ok')}`}>Sincronizado</span>
        )}
      </div>

      {snapshotMeta && (
        <p className="text-xs text-slate-400">
          {snapshotMeta.eventTitle} · {snapshotMeta.ticketCount} entradas · descargado{' '}
          {new Date(snapshotMeta.downloadedAt).toLocaleString('es-AR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>
      )}

      {!snapshotMeta && !isOnline && (
        <p className="text-xs text-amber-300">
          Guardá el listado antes del evento para poder operar sin internet.
        </p>
      )}

      {snapshotMeta && stale && (
        <p className="text-xs text-amber-300">
          El listado puede quedar desactualizado. Sincronizá y volvé a guardar antes de abrir puertas.
        </p>
      )}

      {pendingCount > 0 && (
        <p className="text-xs text-amber-200">
          Validación offline pendiente de sincronizar. Sincronizá cuando recuperes internet.
        </p>
      )}

      {lastSummary && (lastSummary.errors > 0 || lastSummary.conflicts > 0) && (
        <p className="text-xs text-red-300">
          Última sync: {lastSummary.synced} OK · {lastSummary.conflicts} conflictos ·{' '}
          {lastSummary.errors} errores. Revisá manualmente con organización.
        </p>
      )}
    </section>
  );
}
