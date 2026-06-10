'use client';

import type { QueuedScan } from '@/lib/db/offline-scanner';

type Props = {
  conflicts: QueuedScan[];
};

const CODE_LABELS: Record<string, string> = {
  already_used: 'Ya figuraba usada online',
  conflict: 'Conflicto con estado online',
  revoked: 'Entrada revocada',
  transferred: 'Entrada transferida',
  not_found: 'No encontrada',
  rejected: 'Rechazada',
};

export function OfflineConflictPanel({ conflicts }: Props) {
  if (conflicts.length === 0) return null;

  return (
    <section className="rounded-xl border border-red-800/60 bg-red-950/40 p-4">
      <h2 className="text-sm font-semibold text-red-200">Conflictos para revisar</h2>
      <p className="mt-1 text-xs text-red-300/90">
        Estas validaciones offline no coinciden con el estado online. Revisá manualmente con la
        organización.
      </p>
      <ul className="mt-3 flex flex-col gap-2">
        {conflicts.map((c) => (
          <li key={c.id} className="rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-100">
            <p className="font-medium">
              {CODE_LABELS[c.syncCode ?? ''] ?? c.syncCode ?? 'Conflicto'}
            </p>
            <p className="text-xs text-red-200/80">
              {c.ticketId ? `Entrada ${c.ticketId.slice(-8)}` : c.qrPayload.slice(0, 24)}… ·{' '}
              {new Date(c.scannedAt).toLocaleString('es-AR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </p>
            {c.syncMessage && <p className="mt-1 text-xs">{c.syncMessage}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
