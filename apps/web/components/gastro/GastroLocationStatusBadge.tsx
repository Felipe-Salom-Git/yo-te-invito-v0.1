'use client';

import type { GastroLocationSummary } from '@yo-te-invito/shared';
import { GASTRO_LOCATION_STATUS_LABEL } from '@/lib/gastro/gastro-location-status';

const STATUS_LABEL = GASTRO_LOCATION_STATUS_LABEL;

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
      aria-label={`Estado: ${STATUS_LABEL[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
