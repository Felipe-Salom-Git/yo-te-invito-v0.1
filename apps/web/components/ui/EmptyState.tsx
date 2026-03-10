import Link from 'next/link';

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-bg-muted/50 py-16 px-6 text-center">
      {icon && (
        <div className="mb-4 text-4xl text-text-muted" aria-hidden>
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-text">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-text-muted">{description}</p>}
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-6 inline-flex rounded border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10 transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
