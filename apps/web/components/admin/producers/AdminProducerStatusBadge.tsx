const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-border text-text-muted',
  pending: 'bg-amber-500/20 text-amber-600',
  active: 'bg-accent-surface/70 text-accent-soft border border-accent-muted',
  rejected: 'bg-red-500/20 text-red-600',
  suspended: 'bg-gray-500/20 text-gray-500',
  approved: 'bg-accent-surface/70 text-accent-soft border border-accent-muted',
  paused: 'bg-gray-500/20 text-gray-600',
  cancelled: 'bg-red-500/20 text-red-600',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  active: 'Activa',
  rejected: 'Rechazada',
  suspended: 'Suspendida',
  approved: 'Aprobado',
  paused: 'Pospuesto',
  cancelled: 'Cancelado',
};

type AdminProducerStatusBadgeProps = {
  status: string;
};

export function AdminProducerStatusBadge({ status }: AdminProducerStatusBadgeProps) {
  const key = status.toLowerCase();
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[key] ?? STATUS_STYLES.draft}`}
    >
      {STATUS_LABELS[key] ?? status}
    </span>
  );
}
