type EventTicketingBadgeProps = {
  hasTicketing: boolean;
};

export function EventTicketingBadge({ hasTicketing }: EventTicketingBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
        hasTicketing
          ? 'bg-accent-surface/70 text-accent-soft border border-accent-muted'
          : 'bg-border text-text-muted'
      }`}
    >
      {hasTicketing ? 'Con ticketera' : 'Sin ticketera'}
    </span>
  );
}
