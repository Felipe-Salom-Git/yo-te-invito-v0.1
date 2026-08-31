'use client';

import type { GastroLocationSummary } from '@yo-te-invito/shared';

const STATUS_LABEL: Record<GastroLocationSummary['status'], string> = {
  DRAFT: 'Borrador',
  PENDING: 'Pendiente de aprobación',
  ACTIVE: 'Activo',
  REJECTED: 'Rechazado',
  SUSPENDED: 'Suspendido',
};

const STATUS_CLASS: Record<GastroLocationSummary['status'], string> = {
  DRAFT: 'border-border bg-bg-muted/50 text-text-muted',
  PENDING: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  ACTIVE: 'border-accent-muted bg-accent-surface/70 text-accent-soft',
  REJECTED: 'border-red-500/40 bg-red-500/10 text-red-300',
  SUSPENDED: 'border-zinc-500/40 bg-zinc-500/15 text-zinc-400',
};

export function GastroLocationStatusBadge({
  status,
}: {
  status: GastroLocationSummary['status'];
}) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
