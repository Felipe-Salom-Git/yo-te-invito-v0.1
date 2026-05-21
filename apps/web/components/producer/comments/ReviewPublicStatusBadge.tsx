'use client';

import type { ReviewPublicStatus } from '@yo-te-invito/shared';

const LABELS: Partial<Record<ReviewPublicStatus, string>> = {
  VISIBLE: 'Visible',
  IN_REVIEW: 'En revisión',
  HIDDEN: 'Oculta',
  REPORT_REJECTED: 'Reporte rechazado',
  DELETED_BY_USER: 'Eliminada por usuario',
};

const STYLES: Partial<Record<ReviewPublicStatus, string>> = {
  VISIBLE: 'border-emerald-500/40 text-emerald-400',
  IN_REVIEW: 'border-amber-500/40 text-amber-400',
  HIDDEN: 'border-red-500/40 text-red-400',
  REPORT_REJECTED: 'border-border text-text-muted',
  DELETED_BY_USER: 'border-border text-text-muted',
};

export function ReviewPublicStatusBadge({ status }: { status: ReviewPublicStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[status] ?? 'border-border text-text-muted'}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
