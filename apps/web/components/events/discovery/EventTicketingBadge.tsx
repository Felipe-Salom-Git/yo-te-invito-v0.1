export function EventTicketingBadge({ hasTicketing }: { hasTicketing: boolean }) {
  return (
    <span
      className={
        hasTicketing
          ? 'inline-flex rounded-full border border-accent-muted bg-accent-surface/70 px-2 py-0.5 text-xs font-medium text-accent-soft'
          : 'inline-flex rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/60'
      }
    >
      {hasTicketing ? 'Con ticketera' : 'Sin ticketera'}
    </span>
  );
}
