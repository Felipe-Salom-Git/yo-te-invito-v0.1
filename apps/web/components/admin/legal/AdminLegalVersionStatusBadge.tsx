import { legalVersionStatusLabel } from '@/lib/admin/admin-legal-labels';

export function AdminLegalVersionStatusBadge({ status }: { status: string }) {
  const styles =
    status === 'PUBLISHED'
      ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30'
      : status === 'DRAFT'
        ? 'bg-sky-500/15 text-sky-300 ring-sky-500/30'
        : 'bg-bg-muted text-text-muted ring-border/80';

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${styles}`}>
      {legalVersionStatusLabel(status)}
    </span>
  );
}
