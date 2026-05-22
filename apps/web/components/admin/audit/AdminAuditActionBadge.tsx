import { getAuditActionLabel } from '@/lib/admin/audit-labels';

type AdminAuditActionBadgeProps = {
  action: string;
};

export function AdminAuditActionBadge({ action }: AdminAuditActionBadgeProps) {
  const isEvent = action.startsWith('EVENT_');
  const isReview =
    action.startsWith('REVIEW_') || action.includes('DISPUTE');
  const isTicket = action.includes('TICKET') || action === 'ORDER_EXPIRED';

  const style = isEvent
    ? 'border-accent/40 bg-accent/10 text-accent'
    : isReview
      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
      : isTicket
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
        : 'border-border bg-bg-muted text-text-muted';

  return (
    <span
      className={`inline-flex max-w-full rounded px-2 py-0.5 text-xs font-medium ${style}`}
      title={action}
    >
      {getAuditActionLabel(action)}
    </span>
  );
}
