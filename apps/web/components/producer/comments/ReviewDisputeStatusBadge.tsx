import type { ReviewDisputeStatus } from '@/repositories/interfaces';

const LABELS: Record<ReviewDisputeStatus, string> = {
  PENDING: 'Solicitud pendiente',
  IN_REVIEW: 'En revisión',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  RESOLVED: 'Resuelta',
  CANCELLED: 'Cancelada',
};

const STYLES: Record<ReviewDisputeStatus, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  IN_REVIEW: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  ACCEPTED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
  RESOLVED: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  CANCELLED: 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20',
};

export function ReviewDisputeStatusBadge({ status }: { status: ReviewDisputeStatus | null }) {
  if (!status) {
    return (
      <span className="inline-block rounded-full border border-border px-2.5 py-0.5 text-xs text-text-muted">
        Sin solicitud
      </span>
    );
  }
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
