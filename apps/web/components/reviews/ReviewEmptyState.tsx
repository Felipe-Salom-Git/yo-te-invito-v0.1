'use client';

export interface ReviewEmptyStateProps {
  /** Optional custom message */
  message?: string;
  /** Optional submessage */
  submessage?: string;
}

export function ReviewEmptyState({
  message = 'Todavía no hay valoraciones',
  submessage = 'Sé la primera persona en contar su experiencia',
}: ReviewEmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-bg-muted/30 p-8 text-center">
      <p className="text-lg font-medium text-text-muted">{message}</p>
      <p className="mt-1 text-sm text-text-muted/80">{submessage}</p>
    </div>
  );
}
